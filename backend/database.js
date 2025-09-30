// 引入 sqlite3 套件
const sqlite3 = require('sqlite3').verbose();

// 定義資料庫檔案的路徑
const DBSOURCE = "data.db";

// 建立資料庫連線
// 如果 data.db 檔案不存在，這行程式碼會自動建立它
const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // 無法開啟資料庫
    console.error(err.message);
    throw err;
  } else {
    console.log('成功連線到 SQLite 資料庫.');
    // 開啟外鍵約束功能，這對保持資料完整性很重要
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) {
        console.error("無法啟用外鍵功能:", err.message);
      } else {
        console.log("外鍵功能已啟用.");
      }
    });
  }
});

// 將資料庫連線物件匯出
module.exports = db;