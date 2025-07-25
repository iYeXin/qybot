module.exports = {
    defaultPlugin: {
        async main(msgType, msgContent, senderOpenid) {
            return `你好，${senderOpenid}！你说的是: ${msgContent}（请在实际安装插件后删除此默认插件）`;
        },
    },
};