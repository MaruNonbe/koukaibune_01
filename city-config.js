// ============================================================
// city-config.js
// 山形県内35市町村：URLパラメータ用コード対応表
// PalmDragon_WebAR / Mibuchi_Dragon_WebAR01 / Gunkaigijido / koukaibune_01
// など、すべてのWebARプロジェクトで共通利用するファイルです。
//
// 【使い方】
// このファイル1本を、各プロジェクトのindex.htmlと同じフォルダにコピーし、
// index.html内で <script src="city-config.js"></script> を読み込むだけです。
//
// 【自治体を追加・修正したいとき】
// 下の CITY_NAMES オブジェクトに1行追加するだけで、全プロジェクトに反映されます
// （ただし、コピーした先すべてのプロジェクトフォルダのファイルを
//  同じ内容に更新する必要があります＝1箇所直したら他3つにも同じファイルを上書きコピー）
// ============================================================

const CITY_NAMES = {
  // 村山地域
  yamagata:   "山形市",
  sagae:      "寒河江市",
  kaminoyama: "上山市",
  murayama:   "村山市",
  tendo:      "天童市",
  higashine:  "東根市",
  obanazawa:  "尾花沢市",
  yamanobe:   "山辺町",
  nakayama:   "中山町",
  kahoku:     "河北町",
  nishikawa:  "西川町",
  asahi:      "朝日町",
  oe:         "大江町",
  oishida:    "大石田町",

  // 最上地域
  shinjo:     "新庄市",
  kaneyama:   "金山町",
  mogami:     "最上町",
  funagata:   "舟形町",
  mamurogawa: "真室川町",
  ohkura:     "大蔵村",
  sakegawa:   "鮭川村",
  tozawa:     "戸沢村",

  // 置賜地域
  yonezawa:   "米沢市",
  nagai:      "長井市",
  nanyo:      "南陽市",
  takahata:   "高畠町",
  kawanishi:  "川西町",
  oguni:      "小国町",
  shirataka:  "白鷹町",
  iide:       "飯豊町",

  // 庄内地域
  tsuruoka:   "鶴岡市",
  sakata:     "酒田市",
  mikawa:     "三川町",
  shonai:     "庄内町",
  yuza:       "遊佐町",
};