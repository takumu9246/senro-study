// 大問別の出題テーマと出題頻度
// freq：現行形式（8問・150点）になった令和3年度第1回〜令和8年度第1回の11回のうち、
//       そのテーマが出題された回数（問題用紙の設問タイトルから集計）
// qids：このアプリでそのテーマを練習できる問題、lessons：対応するレッスン
const EXAM_ROUNDS = 11;
const EXAM_PARTS = [
  { no: 1, title: '光伝送技術', points: 20, themes: [
    { name: '光増幅器（EDFA）・中継方式・中継伝送の雑音', freq: 10, lessons: ['L12'], qids: ['o22', 'k104', 'k101'] },
    { name: 'WDM・PON・光受動デバイス', freq: 9, lessons: ['L12', 'L13'], qids: ['k107', 'k108', 'c16', 'c17', 'c18', 'c19', 'c20', 'k105', 'k106'] },
    { name: '光の伝搬・基本パラメータ・光ファイバの種類', freq: 7, lessons: ['L08'], qids: ['o01', 'o02', 'o03', 'o15', 'o16', 'k110', 'k109'] },
    { name: '損失・分散・伝送帯域', freq: 7, lessons: ['L09', 'L10'], qids: ['o07', 'o08', 'o12', 'o13', 'o14', 'o17', 'k111', 'k113'] },
    { name: '発光・受光素子と変調方式', freq: 7, lessons: ['L11'], qids: ['k102', 'k112', 'k114'] },
    { name: '平衡対ケーブルの雑音・漏話', freq: 5, lessons: ['L19'], qids: ['m07', 'm08', 'm11', 'm17'] },
    { name: '非線形光学効果', freq: 2, lessons: ['L10'], qids: ['o21', 'k103'] },
  ] },
  { no: 2, title: '線路の特性・ケーブル・接続・架空', points: 20, themes: [
    { name: '一様線路・一次/二次定数・反射（(1)の穴埋め8点）', freq: 11, lessons: ['L17', 'L18'], qids: ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm18', 'm19', 'k201', 'k202', 'm09', 'm10', 'k203'] },
    { name: '架空構造物・電柱・弛度・ダンシング', freq: 10, lessons: ['L21'], qids: ['f08', 'f09', 'f21', 'k206', 'k207', 'k208', 'k209'] },
    { name: '光ファイバの接続（融着・コネクタ・研磨）', freq: 8, lessons: ['L15'], qids: ['c01', 'c02', 'c06', 'c07', 'c08', 'k205', 'k210', 'k215'] },
    { name: '光ファイバ心線・ケーブルの構造', freq: 6, lessons: ['L14'], qids: ['o19', 'o20', 'k204', 'k213'] },
    { name: '光クロージャ・保護等級・線路部材', freq: 6, lessons: ['L14'], qids: ['k214'] },
    { name: '光ファイバの種類・特性', freq: 5, lessons: ['L08', 'L09'], qids: ['o06', 'o10', 'o11', 'o18', 'o24'] },
    { name: 'ケーブルの布設', freq: 4, lessons: ['L22'], qids: ['f19', 'k211', 'k212'] },
  ] },
  { no: 3, title: '線路設備の設計・保守', points: 20, themes: [
    { name: '腐食・劣化・生物被害・浸水などの障害対策', freq: 11, lessons: ['L23'], qids: ['f10', 'f11', 'f12', 'f13', 'k304', 'k310', 'f17', 'k312', 'f18'] },
    { name: '張力・弛度の計算（最後の小問・3点）', freq: 9, lessons: ['L22', 'L21'], qids: ['f06', 'f07', 'f08'], calc: ['pull', 'sagT'] },
    { name: '光の測定・心線対照・接続不良', freq: 9, lessons: ['L16'], qids: ['c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'k309', 'k306'] },
    { name: '誘導・雷・接地', freq: 6, lessons: ['L20'], qids: ['m12', 'm13', 'k303', 'k305', 'f14', 'f15', 'f16', 'f20'] },
    { name: '分散補償・長距離システムの設計', freq: 4, lessons: ['L09'], qids: ['k301', 'k302', 'k311'] },
    { name: 'クリーピング・ケーブルの布設', freq: 4, lessons: ['L22'], qids: ['k307', 'f19'] },
    { name: 'MMS・設備点検', freq: 3, lessons: ['L23'], qids: ['k308'] },
    { name: '光アクセス網の形態・HFC', freq: 3, lessons: ['L13'], qids: ['k115', 'c21'] },
  ] },
  { no: 4, title: '光海底ケーブル', points: 15, themes: [
    { name: 'ケーブルの構造・特性・種類', freq: 10, lessons: ['L24', 'L25'], qids: ['k402', 'k408', 'k409'] },
    { name: '中継器・EDFA・給電・無中継システム', freq: 10, lessons: ['L24'], qids: ['k401', 'k403', 'k404', 'k405'] },
    { name: '保守・故障位置の測定・修理・探線', freq: 7, lessons: ['L25'], qids: ['k406', 'k407'] },
    { name: '敷設・埋設・ルート調査・陸揚', freq: 6, lessons: ['L25'], qids: ['k410'] },
  ] },
  { no: 5, title: '通信土木', points: 15, themes: [
    { name: '管路・マンホールの補修・劣化', freq: 9, lessons: ['L27'], qids: ['k509', 'k510'] },
    { name: '情報BOX・電線共同溝・無電柱化・道路占用・橋梁添架', freq: 9, lessons: ['L26'], qids: ['k508', 'k514'] },
    { name: '管路設備の形態・設計・施工', freq: 8, lessons: ['L26'], qids: ['k507', 'f01', 'f02', 'f03', 'f05'] },
    { name: '土質・地盤・液状化', freq: 5, lessons: ['L27'], qids: ['k501', 'k502', 'k511', 'k512'] },
    { name: '埋設物探査・近接工事', freq: 5, lessons: ['L27'], qids: ['k503', 'k505'] },
    { name: 'とう道', freq: 4, lessons: ['L26'], qids: ['f04', 'k504', 'k513'] },
    { name: 'コンクリート', freq: 3, lessons: ['L27'], qids: ['k506'] },
  ] },
  { no: 6, title: '設備管理・信頼性', points: 26, themes: [
    { name: '信頼性の計算（最後の小問・6点）', freq: 11, lessons: ['L02', 'L03'], qids: ['r02', 'r03', 'r04', 'r18', 'r20', 'r21', 'k608', 'k609', 'k610'], calc: ['avail', 'sysavail', 'rel', 'mttr', 'avdata'] },
    { name: '信頼性の用語・故障率・FTA・信頼性試験', freq: 10, lessons: ['L03', 'L04'], qids: ['r05', 'r06', 'r07', 'r08', 'r09', 'r10', 'r13', 'r14', 'k603', 'k605'] },
    { name: '災害対策・安全信頼性基準・事故報告・BCM', freq: 10, lessons: ['L05'], qids: ['k602', 'k606', 'k607', 'k612', 'k613'] },
    { name: '工程管理・請負契約・設計図書（問7と入れ替わる）', freq: 6, lessons: ['L07', 'L28'], qids: ['q12', 'q13', 'k601', 'k701'], calc: ['cpath'] },
    { name: '設備保全', freq: 5, lessons: ['L04'], qids: ['r15', 'r16', 'r17', 'k604'] },
    { name: '安全活動・品質/労働安全の用語', freq: 5, lessons: ['L29', 'L06'], qids: ['k611', 's14', 's15'] },
  ] },
  { no: 7, title: '施工管理・法令・労働安全', points: 20, themes: [
    { name: '建設業法（許可・請負契約・技術者・施工体制台帳）', freq: 10, lessons: ['L28'], qids: ['k702', 'k711'] },
    { name: '道路占用・電柱/管路ガイドライン・ネットワーク構築', freq: 9, lessons: ['L28'], qids: ['k706', 'k707', 'k708'] },
    { name: '労働安全（高所・酸欠・資格・OSHMS）', freq: 8, lessons: ['L29'], qids: ['s16', 's17', 's19', 'k703', 'k704', 'k709', 'k710'] },
    { name: '工程管理・品質管理の手法・日程短縮', freq: 8, lessons: ['L06', 'L07'], qids: ['q01', 'q02', 'q06', 'q11', 'q12', 'q13', 'q19', 'q20'], calc: ['cpath'] },
    { name: '建設副産物・廃棄物', freq: 4, lessons: ['L29'], qids: ['k705'] },
  ] },
  { no: 8, title: '情報セキュリティ', points: 14, themes: [
    { name: '攻撃手法・脅威・不正アクセス', freq: 9, lessons: ['L31'], qids: ['s10', 'k803', 'k807', 'k808'] },
    { name: 'ISMS 管理策・ポリシー・物理的対策', freq: 9, lessons: ['L31'], qids: ['k802', 's12', 's11'] },
    { name: 'VPN・FW・Web・無線LAN・メール・認証などの技術', freq: 8, lessons: ['L30', 'L31'], qids: ['s08', 's09', 'k806', 'k805', 'k804', 'k809', 'k801', 's13'] },
    { name: '暗号・デジタル署名', freq: 3, lessons: ['L30'], qids: ['s04', 's05', 's06', 's07'] },
  ] },
];
// 頻出テーマ（11回中7回以上）
const FREQUENT = 7;
