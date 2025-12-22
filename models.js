// 添加书签数据源枚举
const BookmarkSource = {
    EXTENSION: 'extension',
    CHROME: 'chrome'
};

function getDateTimestamp(date) {
    if (date === null || date === undefined || date === '') {
        return null;
    }
    if (typeof date === 'number') {
        return date;
    }
    if (typeof date === 'string') {
        const timestamp = new Date(date).getTime();
        if (isNaN(timestamp)) {
            return null;
        }
        return timestamp;
    }
    if (date instanceof Date) {
        return date.getTime();
    }
    return null;
}

// 统一的书签数据结构
class UnifiedBookmark {
    constructor(data, source) {
        this.url = data.url;
        this.title = data.title;
        this.source = source;
        
        if (source === BookmarkSource.EXTENSION) {
            this.tags = data.tags;
            this.excerpt = data.excerpt;
            this.embedding = data.embedding;
            // 这里需要确保日期格式的一致性
            this.savedAt = data.savedAt ? getDateTimestamp(data.savedAt) : Date.now();
            this.useCount = data.useCount;
            this.lastUsed = data.lastUsed ? getDateTimestamp(data.lastUsed) : null;
            this.apiService = data.apiService;
            this.embedModel = data.embedModel;
            this.isCached = data.isCached;
        } else {
            this.tags = [...data.folderTags || []];
            this.excerpt = '';
            this.embedding = null;
            // Chrome书签的日期是时间戳（毫秒）
            this.savedAt = getDateTimestamp(data.dateAdded);
            this.useCount = 0;
            this.lastUsed = data.dateLastUsed ? getDateTimestamp(data.dateLastUsed) : null;
            this.chromeId = data.id;
        }
    }
}