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

function normalizeHierarchicalTags(tags) {
    const normalizedTags = Array.from(new Set((tags || []).filter(Boolean).map(tag => tag.trim()).filter(Boolean)));
    return normalizedTags.filter(tag => !normalizedTags.some(otherTag => otherTag !== tag && otherTag.startsWith(tag + '/')));
}

function getEffectiveHierarchicalTags(data) {
    const hierarchicalTags = Array.isArray(data?.hierarchicalTags)
        ? normalizeHierarchicalTags(data.hierarchicalTags)
        : [];
    if (hierarchicalTags.length > 0) {
        return hierarchicalTags;
    }
    return normalizeHierarchicalTags(data?.tags || data?.folderTags || []);
}

// 统一的书签数据结构
class UnifiedBookmark {
    constructor(data, source) {
        this.url = data.url;
        this.title = data.title;
        this.source = source;
        
        if (source === BookmarkSource.EXTENSION) {
            this.tags = data.tags;
            this.hierarchicalTags = getEffectiveHierarchicalTags(data);
            this.excerpt = data.excerpt;
            this.embedding = data.embedding;
            // 这里需要确保日期格式的一致性
            this.savedAt = data.savedAt ? getDateTimestamp(data.savedAt) : Date.now();
            this.useCount = data.useCount;
            this.lastUsed = data.lastUsed ? getDateTimestamp(data.lastUsed) : null;
            this.apiService = data.apiService;
            this.embedModel = data.embedModel;
            this.isCached = data.isCached;
            this.tagVersion = data.tagVersion;
            this.importSource = data.importSource;
            this.importedFromChrome = data.importedFromChrome;
            this.importMeta = data.importMeta;
        } else {
            this.tags = [...data.folderTags || []];
            this.hierarchicalTags = getEffectiveHierarchicalTags({
                hierarchicalTags: data.hierarchicalTags,
                tags: data.folderTags,
                folderTags: data.folderTags
            });
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


function unifiedBookmarkToLocalFormat(bookmark) {
    const effectiveHierarchicalTags = getEffectiveHierarchicalTags(bookmark);
    const localBookmark = {
        url: bookmark.url,
        title: bookmark.title,
        tags: bookmark.tags,
        hierarchicalTags: effectiveHierarchicalTags,
        excerpt: bookmark.excerpt,
        embedding: bookmark.embedding,
        savedAt: bookmark.savedAt,
        useCount: bookmark.useCount,
        lastUsed: bookmark.lastUsed,
        apiService: bookmark.apiService,
        embedModel: bookmark.embedModel,
        tagVersion: bookmark.tagVersion,
        source: bookmark.source,
        importSource: bookmark.importSource,
        importedFromChrome: bookmark.importedFromChrome,
        importMeta: bookmark.importMeta,
    };
    logger.debug('将书签转换为本地格式', { bookmark: bookmark, localBookmark: localBookmark });
    return localBookmark;
}