// 筛选规则管理器
class CustomFilter {
    constructor() {
        this.STORAGE_KEY = 'customFilters';
        this.STORAGE_KEY_ORDER = 'customFiltersOrder';
        this.rules = [];
        this.orderedIds = [];
        this.initialized = false;
        // 内置的筛选规则
        this.builtInRules = [
            {
                id: 'recent-bookmarks',
                name: '今日添加',
                isBuiltIn: true,
                conditions: [
                    {
                        field: 'create',
                        operator: '=',
                        value: 1
                    }
                ]
            },
            {
                id: 'today-used',
                name: '今日使用',
                isBuiltIn: true,
                conditions: [
                    {
                        field: 'lastUse',
                        operator: '=',
                        value: 1
                    }
                ]
            }
        ];
    }

    async init() {
        if (this.initialized) return;
        
        try {
            // 从存储中加载规则
            const stored = await chrome.storage.sync.get(this.STORAGE_KEY);
            this.rules = stored[this.STORAGE_KEY] || [];
            const storedOrder = await chrome.storage.sync.get(this.STORAGE_KEY_ORDER);
            this.orderedIds = storedOrder[this.STORAGE_KEY_ORDER] || [];
            this.initialized = true;
        } catch (error) {
            logger.error('初始化筛选规则失败:', error);
        }
    }

    async saveFilterOrder(orderedIds) {
        // 检查顺序是否变化
        if (JSON.stringify(orderedIds) === JSON.stringify(this.orderedIds)) {
            logger.debug('筛选规则顺序未发生变化');
            return;
        }
        logger.debug('筛选规则顺序发生变化');
        // 保存新的顺序
        try {
            await chrome.storage.sync.set({
                [this.STORAGE_KEY_ORDER]: orderedIds
            });
            this.orderedIds = orderedIds;
        } catch (error) {
            logger.error('保存筛选规则顺序失败:', error);
        }
    }

    // 保存规则到存储
    async saveRule(rule) {
        try {
            // 检查是否存在相同ID的规则
            const existingIndex = this.rules.findIndex(r => r.id === rule.id);
            if (existingIndex !== -1) {
                // 更新现有规则
                this.rules[existingIndex] = rule;
            } else {
                // 添加新规则
                this.rules.push(rule);
            }

            await chrome.storage.sync.set({
                [this.STORAGE_KEY]: this.rules
            });
            return true;
        } catch (error) {
            logger.error('保存筛选规则失败:', error);
            return false;
        }
    }

    // 删除规则
    async deleteRule(ruleId) {
        try {
            this.rules = this.rules.filter(r => r.id !== ruleId);
            await chrome.storage.sync.set({
                [this.STORAGE_KEY]: this.rules
            });
            return true;
        } catch (error) {
            logger.error('删除筛选规则失败:', error);
            return false;
        }
    }

    async reloadRules() {
        this.initialized = false;
        await this.init();
    }

    // 获取所有规则
    getRules() {
        const rules = [...this.builtInRules, ...this.rules];
        if (this.orderedIds.length > 0) {
            return rules.sort((a, b) => {
                const indexA = this.orderedIds.indexOf(a.id);
                const indexB = this.orderedIds.indexOf(b.id);
                // 如果两个都不在orderedIds中，保持原有顺序
                if (indexA === -1 && indexB === -1) return 0;
                // 如果其中一个不在orderedIds中，将其排在后面
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                // 都在orderedIds中，按照索引排序
                return indexA - indexB;
            });
        }
        return rules;
    }

    async getExportData() {
        await this.reloadRules();
        return {
            rules: this.rules || [],
            orderedIds: this.orderedIds || []
        };
    }

    async importFilters(filters, overwrite = false) {
        try {
            // 确保初始化完成
            if (!this.initialized) {
                await this.init();
            }
    
            // 验证导入的数据格式
            if (!Array.isArray(filters.rules) || !Array.isArray(filters.orderedIds)) {
                logger.error('导入的筛选规则格式无效');
                return;
            }
    
            const newRules = filters.rules.filter(rule => {
                // 验证规则格式
                if (!rule.id || !rule.name || !Array.isArray(rule.conditions)) {
                    logger.warn(`跳过无效的规则: ${rule}`);
                    return false;
                }
                return true;
            });
            // 根据模式处理规则导入
            if (!overwrite) {
                // 合并模式：保留现有规则，添加新规则
                const existingIds = new Set(this.rules.map(rule => rule.id));
                const filteredRules = newRules.filter(rule => {
                    return !existingIds.has(rule.id);
                });
                
                this.rules = [...this.rules, ...filteredRules];
                this.orderedIds = filters.orderedIds || [];
            } else {
                // 覆盖模式：完全替换现有规则
                this.rules = newRules;
                this.orderedIds = filters.orderedIds || [];
            }
    
            // 保存更新
            await chrome.storage.sync.set({
                [this.STORAGE_KEY]: this.rules,
                [this.STORAGE_KEY_ORDER]: this.orderedIds
            });
    
        } catch (error) {
            logger.error('导入筛选规则失败:', error);
            throw error;
        }
    }

    // 根据规则筛选书签
    async filterBookmarks(bookmarks, rule) {
        if (!rule) return bookmarks;

        const filteredBookmarks = bookmarks.filter(bookmark => {
            return this.evaluateBookmark(bookmark, rule.conditions);
        });
        return filteredBookmarks;
    }

    // 评估单个条件
    evaluateCondition(bookmark, condition) {
        const { field, operator, value } = condition;

        const isValid = CustomFilterConditions.validateCondition(condition);
        if (!isValid) {
            logger.warn(`跳过无效的条件: ${condition}`);
            return true;
        }
        
        switch (field) {
            case 'title':
                return this.evaluateTextCondition(bookmark.title, condition);
                
            case 'domain':
                const domain = new URL(bookmark.url).hostname;
                return this.evaluateTextCondition(domain, condition);
            
            case 'url':
                return this.evaluateTextCondition(bookmark.url, condition);
                
            case 'tag':
                return this.evaluateTagCondition(bookmark.tags, condition);
                
            case 'create':
                const createDays = this.getDaysDifference(new Date(bookmark.savedAt));
                return this.evaluateNumberCondition(createDays, operator, value);
                
            case 'lastUse':
                const lastUse = bookmark.lastUsed ? new Date(bookmark.lastUsed) : new Date(bookmark.savedAt);
                const lastUseDays = this.getDaysDifference(lastUse);
                return this.evaluateNumberCondition(lastUseDays, operator, value);
                
            case 'use':
                return this.evaluateNumberCondition(bookmark.useCount || 0, operator, value);
                
            default:
                return true;
        }
    }

    // 评估文本条件
    evaluateTextCondition(text, condition) {
        if (!text) return false;
        text = text.toLowerCase();

        const values = CustomFilterConditions.getConditionArrayValue(condition);
        if (!values) return false;

        const { operator } = condition;  
        switch (operator) {
            case 'is':
                return values.some(v => text === v.toLowerCase());
            case 'isNot':
                return !values.some(v => text === v.toLowerCase());
            case 'has':
                return values.some(v => text.includes(v.toLowerCase()));
            case 'notHas':
                return !values.some(v => text.includes(v.toLowerCase()));
            default:
                return false;
        }
    }

    // 评估标签条件
    evaluateTagCondition(tags, condition) {
        if (!tags || !Array.isArray(tags)) return false;
        const lowerTags = tags.map(t => t.toLowerCase());

        const values = CustomFilterConditions.getConditionArrayValue(condition);
        if (!values) return false;
        
        const { operator } = condition;
        switch (operator) {
            case 'is':
                return values.some(v => lowerTags.some(tag => tag === v.toLowerCase()));
            case 'isNot':
                return !values.some(v => lowerTags.some(tag => tag === v.toLowerCase()));
            case 'has':
                return values.some(v => lowerTags.some(tag => tag.includes(v.toLowerCase())));
            case 'notHas':
                return !values.some(v => lowerTags.some(tag => tag.includes(v.toLowerCase())));
            default:
                return false;
        }
    }

    // 评估数字条件
    evaluateNumberCondition(number, operator, value) {
        const numValue = parseInt(value);
        if (isNaN(numValue)) return false;
        
        switch (operator) {
            case '>':
                return number > numValue;
            case '<':
                return number < numValue;
            case '=':
                return number === numValue;
            default:
                return false;
        }
    }

    // 计算天数差异
    getDaysDifference(date) {
        const now = new Date();
        // 将两个日期都设置为当天的 00:00:00
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTargetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        // 计算天数差
        const diffTime = Math.abs(startOfToday - startOfTargetDay);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // 评估书签是否匹配规则条件
    evaluateBookmark(bookmark, conditions) {
        // 如果没有条件，返回 true
        if (!conditions || conditions.length === 0) {
            return true;
        }
        
        // 遍历所有条件
        return conditions.every(condition => {
            // 如果是条件组（数组），则组内条件是"或"关系
            if (Array.isArray(condition)) {
                return condition.some(groupCondition => 
                    this.evaluateCondition(bookmark, groupCondition)
                );
            }
            // 单个条件直接评估
            return this.evaluateCondition(bookmark, condition);
        });
    }
}

class CustomFilterConditions {
    static fields = [
        { value: 'title', label: '标题', isNumber: false, operatorGroup: 'text'},
        { value: 'domain', label: '域名', isNumber: false, operatorGroup: 'text' },
        { value: 'url', label: '链接', isNumber: false, operatorGroup: 'text' },
        { value: 'tag', label: '标签', isNumber: false, operatorGroup: 'textArray' },
        { value: 'create', label: '创建时间', isNumber: true, unit: '天', operatorGroup: 'number' },
        { value: 'lastUse', label: '上次使用', isNumber: true, unit: '天', operatorGroup: 'number' },
        { value: 'use', label: '使用次数', isNumber: true, unit: '次', operatorGroup: 'number' }
    ];
        
    static operators = {
        text: [
            { value: 'is', label: '等于'},
            { value: 'isNot', label: '不等于' },
            { value: 'has', label: '包含', isArray: true },
            { value: 'notHas', label: '不包含', isArray: true }
        ],
        number: [
            { value: '>', label: '大于' },
            { value: '<', label: '小于' },
            { value: '=', label: '等于' }
        ],
        textArray: [
            { value: 'is', label: '等于', isArray: true },
            { value: 'isNot', label: '不等于', isArray: true },
            { value: 'has', label: '包含', isArray: true },
            { value: 'notHas', label: '不包含', isArray: true }
        ],
    };

    static getFields() {
        return this.fields;
    }
    
    static getFieldSettings(field) {
        return this.fields.find(f => f.value === field);
    }

    static getOperators(operatorGroup) {
        if (!operatorGroup) {
            return this.operators;
        }
        return this.operators[operatorGroup];
    }

    static getOperatorSetting(operatorGroup, operator) {
        const ops = this.getOperators(operatorGroup);
        if (!ops) {
            return null;
        } else {
            return ops.find(o => o.value === operator);
        }
    }

    static validateCondition(condition) {
        const { field, operator, value, arrayValue } = condition;
        const fieldSetting = this.getFieldSettings(field);
        if (!fieldSetting) {
            return false;
        }
        const operatorGroup = fieldSetting.operatorGroup;
        const opSetting = this.getOperatorSetting(operatorGroup, operator);
        if (!opSetting) {
            return false;
        }
        // 检查值是否为空
        if (value === '' || value === null || value === undefined) {
            return false;
        }
        // 如果是数组（标签），检查是否为空数组
        if (arrayValue && Array.isArray(arrayValue) && arrayValue.length === 0) {
            return false;
        }
        // 检查是否为数字
        const isNumber = fieldSetting?.isNumber;
        if (isNumber) {
            const num = parseInt(value);
            if (isNaN(num) || num < 0) {
                return false;
            }
        }
        
        return true;
    }

    static getConditionArrayValue(condition) {
        if (condition.arrayValue) {
            return condition.arrayValue;
        }
        if (Array.isArray(condition.value)) {
            return condition.value;
        }
        return [condition.value];
    }
}

// 导出单例实例
const customFilter = new CustomFilter();
