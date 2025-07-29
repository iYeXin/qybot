module.exports = {
    defaultPlugin: {
        async main(msgType, msgContent, senderOpenid) {
            return `你好，${senderOpenid}！你说的是: ${msgType} ${msgContent}`;
        },
    },
};