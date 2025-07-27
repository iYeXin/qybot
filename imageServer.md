# 图片上传服务器规范

## 满足下述规范的服务器可直接投入使用

1. 通过`POST请求`上传图片，请求头中已经含有 MIME 类型，请求体为图片的二进制数据
2. 处理完成后返回图片的 url，json 格式：{"url": "https://..."}

## 增强选项

1. 私有服务器可以在路径中指定密钥以保证安全性
2. 建议设置 url 的有效期为 30-120 秒

## PHP 示例

```php
    <?php
    // 配置设置
    $uploadDir = __DIR__ . '/tmp_images/';  // 图片存储目录
    $baseUrl = getBaseUrl();                // 自动获取基础URL
    $expireSeconds = 60;                   // 有效期60秒(2分钟)

    // 创建存储目录（如果不存在）
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // 清理过期文件
    cleanupExpiredFiles($uploadDir, $expireSeconds);

    // 验证请求方法
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        die(json_encode(['error' => '只允许POST请求']));
    }

    // 获取Content-Type
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (empty($contentType)) {
        http_response_code(400);
        die(json_encode(['error' => '缺少Content-Type请求头']));
    }

    // 验证文件类型
    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'image/svg+xml' => 'svg'
    ];

    if (!isset($allowedTypes[$contentType])) {
        http_response_code(400);
        die(json_encode(['error' => '不支持的文件类型: ' . $contentType]));
    }

    // 获取文件扩展名
    $extension = $allowedTypes[$contentType];

    // 读取二进制数据
    $imageData = file_get_contents('php://input');
    if ($imageData === false || strlen($imageData) === 0) {
        http_response_code(400);
        die(json_encode(['error' => '未接收到图片数据']));
    }

    // 验证图片有效性
    if (!@imagecreatefromstring($imageData)) {
        http_response_code(400);
        die(json_encode(['error' => '无效的图片数据']));
    }

    // 生成唯一文件名
    $filename = 'img_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
    $filePath = $uploadDir . $filename;

    // 保存文件
    if (file_put_contents($filePath, $imageData) === false) {
        http_response_code(500);
        die(json_encode(['error' => '文件保存失败']));
    }

    // 生成访问URL
    $imageUrl = $baseUrl . '/tmp_images/' . rawurlencode($filename);

    // 返回JSON响应
    header('Content-Type: application/json');
    echo json_encode([
        'url' => $imageUrl,
        'expires_at' => time() + $expireSeconds
    ]);

    // 清理过期文件函数
    function cleanupExpiredFiles($dir, $expireSeconds) {
        $files = glob($dir . '*');
        $now = time();

        foreach ($files as $file) {
            if (is_file($file) && ($now - filemtime($file)) > $expireSeconds) {
                @unlink($file);
            }
        }
    }

    // 获取基础URL函数
    function getBaseUrl() {
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $path = dirname($_SERVER['SCRIPT_NAME']);

        // 标准化路径（移除结尾斜杠）
        $path = rtrim($path, '/\\');

        return $protocol . '://' . $host . $path;
    }
```
