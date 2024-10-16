const express = require('express');
const log4js = require('log4js');
const dotenv = require('dotenv');
const http = require('http');
const https = require('https');
const fs = require('fs');
const compression = require('compression');
const bodyParser = require('body-parser');
const sanitizeHtml = require('sanitize-html');
const nodemailer = require('nodemailer');

//環境変数の設定
dotenv.config();

//log4jsの設定
log4js.configure({
  appenders: {
    server: {
      type: 'file',
      filename: 'log/server.log',
    },
  },
  categories: {
    default: {
      appenders: ['server'],
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    error: {
      appenders: ['server'],
      level: 'error',
    },
  },
});
const systemLogger = log4js.getLogger('default');
const errorLogger = log4js.getLogger('error');
console.log('起動しました。');
systemLogger.info('起動しました。');

//環境変数の確認
const requiredEnvs = ['NODE_ENV', 'PORT', 'KEY_FILE_PATH', 'CERT_FILE_PATH', 'EMAIL_ACCOUNT', 'EMAIL_APP_PASSWORD', 'EMAIL_ADDRESS'];
requiredEnvs.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`環境変数 ${envVar} が設定されていません。`);
    errorLogger.error(`環境変数 ${envVar} が設定されていません。`);
    process.exit(1);
  }
});

//未キャッチの例外をログに記録してクリーンアップ処理
process.on('uncaughtException', (err) => {
  console.error('未キャッチの例外:', err);
  errorLogger.error('未キャッチの例外:', err);
  process.exit(1);
});

//未処理のPromiseの拒否をログに記録してクリーンアップ処理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromiseの拒否:', reason);
  errorLogger.error('未処理のPromiseの拒否:', reason);
  process.exit(1);
});

//expressアプリケーションの設定
const app = express();
const port = process.env.PORT;

//ミドルウェアの設定
app.use(compression());
app.use('/', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//HTTPサーバーの設定と起動 HTTPSへのリダイレクト
http
  .createServer((req, res) => {
    res.writeHead(301, {
      Location: `https://${req.headers.host}${req.url}`,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });
    res.end();
  })
  .listen(80, () => {
    console.log('HTTPリダイレクトサーバーがポート80で待機中です。');
    systemLogger.info('HTTPリダイレクトサーバーがポート80で待機中です。');
  })
  .on('error', (err) => {
    console.error('HTTPサーバー起動失敗：', err);
    errorLogger.error('HTTPサーバー起動失敗：', err);
  });

//HTTPSサーバーの設定と起動
const options = {
  key: fs.readFileSync(process.env.KEY_FILE_PATH, 'utf8'),
  cert: fs.readFileSync(process.env.CERT_FILE_PATH, 'utf8'),
};
https
  .createServer(options, app)
  .listen(port, () => {
    console.log(`${port}番ポートで待機中です。`);
    systemLogger.info(`${port}番ポートで待機中です。`);
  })
  .on('error', (err) => {
    console.error('HTTPSサーバー起動失敗：', err);
    errorLogger.error('HTTPSサーバー起動失敗：', err);
    process.exit(1);
  });

/*お問い合わせフォーム処理*/
//メール送信設定
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_ACCOUNT,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});
// フォームバリデーション
function formValidate(name, email, comment) {
  const errors = [];
  const rules = {
    name: {
      required: true,
      maxLength: 30,
      message: 'お名前を入力してください。',
      maxLengthMessage: 'お名前は30文字以内で入力してください。',
    },
    email: {
      required: true,
      maxLength: 50,
      message: 'メールアドレスを入力してください。',
      maxLengthMessage: 'メールアドレスは50文字以内で入力してください。',
    },
    comment: {
      required: true,
      maxLength: 300,
      message: 'コメントを入力してください。',
      maxLengthMessage: 'コメントは300文字以内で入力してください。',
    },
  };
  for (const field in rules) {
    const value = { name, email, comment }[field];
    const { required, maxLength, message, maxLengthMessage } = rules[field];
    if (required && !value) {
      errors.push(message);
    } else {
      if (field === 'email') {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const emailPatternMessage = 'メールアドレスの形式が不正です。';
        if (!emailPattern.test(email)) {
          errors.push(emailPatternMessage);
        }
      }
      if (maxLength && value.length >= maxLength) {
        errors.push(maxLengthMessage);
      }
    }
  }
  return errors.join('\n');
}
//POSTリクエストの処理
app.post('/send-email', async (req, res) => {
  systemLogger.info({
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers,
    ip: req.ip,
    timestamp: new Date(Date.now()).toLocaleString(),
  });
  const { name, email, comment } = req.body;
  //サニタイジング
  const sanitizedName = sanitizeHtml(name);
  const sanitizedEmail = sanitizeHtml(email);
  const sanitizedComment = sanitizeHtml(comment);
  //バリデーション
  const validateError = formValidate(sanitizedName, sanitizedEmail, sanitizedComment);
  if (validateError) {
    console.error(validateError);
    errorLogger.error(validateError);
    return res.status(400).json({ error: `メールの送信に失敗しました。（400エラー）\n詳細：\n ${validateError}` });
  }
  //メールの内容設定
  const mailOptions = {
    from: `${sanitizedName} <${sanitizedEmail}>`,
    to: process.env.EMAIL_ADDRESS,
    subject: 'お問い合わせ',
    text: `Name: ${sanitizedName}\nEmail: ${sanitizedEmail}\nComment: ${sanitizedComment}`,
  };
  //非同期でメールの送信
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('メール送信成功: ', info.response);
    systemLogger.info('メール送信成功：', info.response);
    res.status(200).json({ message: 'メールの送信が完了しました。' });
  } catch (err) {
    console.error('メール送信失敗：', err);
    errorLogger.error('メール送信失敗：', err);
    res.status(500).json({ error: `メールの送信に失敗しました。` });
  }
});

//グローバルなエラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('エラーが発生しました:', err);
  errorLogger.error('エラーが発生しました:', err);
  res.status(err.status || 500).json({
    error: 'サーバー内部でエラーが発生しました。',
  });
});
