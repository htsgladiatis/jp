<?php
/**
 * Обработчик заявки с формы на лендинге.
 * Требует PHP 7.4+ (на Beget включён по умолчанию).
 *
 * Установка:
 *   1. Замените $MAIL_TO на адрес, куда присылать заявки.
 *   2. В index.html у формы поставьте data-endpoint="php/send.php".
 *   3. Загрузите сайт на хостинг и отправьте тестовую заявку.
 *
 * Если письма не доходят, проверьте папку «Спам» и настройки почты
 * в панели Beget: для домена должны быть прописаны MX и SPF.
 */

declare(strict_types=1);

$MAIL_TO   = 'lead@job-person.ru';        // куда присылать заявки
$MAIL_FROM = 'no-reply@job-person.ru';    // адрес отправителя на вашем домене
$SUBJECT   = 'Заявка с сайта Job Person';

header('Content-Type: application/json; charset=utf-8');

function respond(bool $ok, string $message = '', int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'error' => $ok ? null : $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'Метод не поддерживается', 405);
}

// защита от ботов: поле-ловушка должно быть пустым
if (trim((string)($_POST['company'] ?? '')) !== '') {
    respond(true);
}

$clean = static function (string $value, int $limit = 500): string {
    $value = strip_tags(trim($value));
    $value = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $value);
    return mb_substr($value, 0, $limit);
};

$name    = $clean((string)($_POST['name'] ?? ''), 80);
$phone   = $clean((string)($_POST['phone'] ?? ''), 40);
$comment = $clean((string)($_POST['comment'] ?? ''), 400);

if (mb_strlen($name) < 2) {
    respond(false, 'Укажите имя', 422);
}

$digits = preg_replace('/\D+/', '', $phone) ?? '';
if (strlen($digits) < 10) {
    respond(false, 'Укажите телефон', 422);
}

$body = implode("\n", [
    'Новая заявка с сайта',
    '---',
    'Имя: ' . $name,
    'Телефон: ' . $phone,
    'Задача: ' . ($comment !== '' ? $comment : '—'),
    '---',
    'Страница: ' . ($_SERVER['HTTP_REFERER'] ?? 'неизвестно'),
    'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'неизвестно'),
    'Время: ' . date('d.m.Y H:i'),
]);

$headers = implode("\r\n", [
    'From: Job Person <' . $MAIL_FROM . '>',
    'Reply-To: ' . $MAIL_FROM,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    'X-Mailer: job-person.ru',
]);

$sent = @mail(
    $MAIL_TO,
    '=?UTF-8?B?' . base64_encode($SUBJECT) . '?=',
    $body,
    $headers
);

if (!$sent) {
    respond(false, 'Не удалось отправить письмо. Позвоните: +7 903 136-40-09', 500);
}

respond(true);
