// Multi-language translations
export type Language = "en" | "ko" | "jp" | "cn" | "vn";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header & Navigation
    "app.title": "YieldNova",
    "app.subtitle": "DeFi Platform",
    "nav.dashboard": "Dashboard",
    "nav.market": "Market",
    "nav.package": "Package",
    "nav.community": "Community",
    "nav.connect_wallet": "Connect Wallet",
    "nav.logout": "Logout",

    // Dashboard
    "dashboard.title": "YieldNova DeFi Platform",
    "dashboard.subtitle": "Smart yield creation with BSC-based YNV tokens. Organize your network and USDT deposit system with a DeFi platform.",
    "dashboard.start_deposit": "Start Deposit",
    "dashboard.explore_market": "Explore Market",

    // Wallet
    "wallet.connected": "Wallet Connected",
    "wallet.connect": "Connect Wallet",
    "wallet.disconnect": "Disconnect",
    "wallet.address": "Address",
    "wallet.balance": "Balance",
    "wallet.insufficient": "Insufficient balance",

    // YNV Token
    "token.ynv": "YNV",
    "token.ynv_balance": "YNV Balance",
    "token.ynv_price": "YNV Price",
    "token.current_price": "Current YNV Price",
    "token.usdt": "USDT",

    // Deposit & Level
    "deposit.title": "Deposit",
    "deposit.start": "Start Deposit",
    "deposit.amount": "Deposit Amount",
    "deposit.usdt_amount": "USDT Amount",
    "deposit.point_amount": "Point Amount",
    "deposit.before_deposit": "Before Deposit",
    "deposit.level_up": "Level Up",
    "deposit.level_up_request": "Level Up Request",
    "deposit.current_level": "Current Level",
    "deposit.next_level": "Next Level",
    "deposit.required_points": "Required Points",
    "deposit.your_points": "Your Points",
    "deposit.insufficient_points": "Insufficient points",
    "deposit.success": "Deposit successful",
    "deposit.error": "Deposit failed",

    // Referral & Bonus
    "referral.title": "Referral",
    "referral.my_referral_link": "My Referral Link",
    "referral.copy_link": "Copy Link",
    "referral.referral_count": "Referral Count",
    "referral.direct_bonus": "Direct Bonus",
    "referral.direct_bonus_percent": "10% Direct Referral Bonus",
    "referral.upline_bonus": "Upline Bonus",
    "referral.upline_bonus_percent": "8% × 10 Levels Upline Matching",
    "referral.total_bonus": "Total Bonus",

    // Organization
    "organization.title": "Organization",
    "organization.binary_tree": "Binary Tree",
    "organization.upline": "Upline",
    "organization.downline": "Downline",
    "organization.level": "Level",
    "organization.members": "Members",

    // Withdrawal
    "withdrawal.title": "Withdrawal",
    "withdrawal.request": "Request Withdrawal",
    "withdrawal.pending": "Pending",
    "withdrawal.approved": "Approved",
    "withdrawal.rejected": "Rejected",
    "withdrawal.reason": "Reason",
    "withdrawal.success": "Withdrawal request submitted",
    "withdrawal.error": "Withdrawal failed",

    // Admin
    "admin.title": "Admin Panel",
    "admin.access_denied": "Access Denied",
    "admin.admin_wallet_required": "Admin wallet required",
    "admin.overview": "Overview",
    "admin.price_setting": "Price Setting",
    "admin.withdrawal_management": "Withdrawal Management",
    "admin.wallet_management": "Wallet Management",
    "admin.current_ynv_price": "Current YNV Price",
    "admin.pending_withdrawals": "Pending Withdrawals",
    "admin.approve": "Approve",
    "admin.reject": "Reject",
    "admin.lock_wallet": "Lock Wallet",
    "admin.unlock_wallet": "Unlock Wallet",
    "admin.locked_wallets": "Locked Wallets",

    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.copy": "Copy",
    "common.copied": "Copied!",
    "common.close": "Close",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
  },
  ko: {
    // Header & Navigation
    "app.title": "YieldNova",
    "app.subtitle": "DeFi 플랫폼",
    "nav.dashboard": "대시보드",
    "nav.market": "마켓",
    "nav.package": "패키지",
    "nav.community": "커뮤니티",
    "nav.connect_wallet": "지갑 연결",
    "nav.logout": "로그아웃",

    // Dashboard
    "dashboard.title": "YieldNova DeFi 플랫폼",
    "dashboard.subtitle": "BSC 블록체인 기반 YNV 토큰으로 스마트한 수익을 창출하세요. 바이너리 조직 구조와 USDT 출금 시스템을 갖춘 자체대 DeFi 플랫폼입니다.",
    "dashboard.start_deposit": "지금 시작하기",
    "dashboard.explore_market": "시세 확인하기",

    // Wallet
    "wallet.connected": "지갑 연결됨",
    "wallet.connect": "지갑 연결",
    "wallet.disconnect": "연결 해제",
    "wallet.address": "주소",
    "wallet.balance": "잔액",
    "wallet.insufficient": "잔액 부족",

    // YNV Token
    "token.ynv": "YNV",
    "token.ynv_balance": "YNV 잔액",
    "token.ynv_price": "YNV 가격",
    "token.current_price": "현재 YNV 가격",
    "token.usdt": "USDT",

    // Deposit & Level
    "deposit.title": "입금",
    "deposit.start": "입금 시작",
    "deposit.amount": "입금액",
    "deposit.usdt_amount": "USDT 입금액",
    "deposit.point_amount": "포인트 수량",
    "deposit.before_deposit": "입금 전",
    "deposit.level_up": "레벨 업",
    "deposit.level_up_request": "레벨 신청",
    "deposit.current_level": "현재 레벨",
    "deposit.next_level": "다음 레벨",
    "deposit.required_points": "필요 포인트",
    "deposit.your_points": "보유 포인트",
    "deposit.insufficient_points": "포인트 부족",
    "deposit.success": "입금이 완료되었습니다",
    "deposit.error": "입금에 실패했습니다",

    // Referral & Bonus
    "referral.title": "추천",
    "referral.my_referral_link": "내 추천 링크",
    "referral.copy_link": "링크 복사",
    "referral.referral_count": "추천 인원",
    "referral.direct_bonus": "직추천 보너스",
    "referral.direct_bonus_percent": "10% 직추천 보너스",
    "referral.upline_bonus": "상위 보너스",
    "referral.upline_bonus_percent": "8% × 10단계 상위 매칭",
    "referral.total_bonus": "총 보너스",

    // Organization
    "organization.title": "조직",
    "organization.binary_tree": "바이너리 트리",
    "organization.upline": "상위",
    "organization.downline": "하위",
    "organization.level": "레벨",
    "organization.members": "회원",

    // Withdrawal
    "withdrawal.title": "출금",
    "withdrawal.request": "출금 신청",
    "withdrawal.pending": "대기 중",
    "withdrawal.approved": "승인됨",
    "withdrawal.rejected": "거절됨",
    "withdrawal.reason": "사유",
    "withdrawal.success": "출금 신청이 완료되었습니다",
    "withdrawal.error": "출금에 실패했습니다",

    // Admin
    "admin.title": "관리자 패널",
    "admin.access_denied": "접근 거부",
    "admin.admin_wallet_required": "관리자 지갑 필요",
    "admin.overview": "개요",
    "admin.price_setting": "가격 설정",
    "admin.withdrawal_management": "출금 관리",
    "admin.wallet_management": "지갑 관리",
    "admin.current_ynv_price": "현재 YNV 가격",
    "admin.pending_withdrawals": "대기 중인 출금",
    "admin.approve": "승인",
    "admin.reject": "거절",
    "admin.lock_wallet": "지갑 잠금",
    "admin.unlock_wallet": "지갑 잠금 해제",
    "admin.locked_wallets": "잠금된 지갑",

    // Common
    "common.loading": "로딩 중...",
    "common.error": "오류",
    "common.success": "성공",
    "common.cancel": "취소",
    "common.confirm": "확인",
    "common.save": "저장",
    "common.delete": "삭제",
    "common.edit": "수정",
    "common.copy": "복사",
    "common.copied": "복사됨!",
    "common.close": "닫기",
    "common.back": "뒤로",
    "common.next": "다음",
    "common.previous": "이전",
  },
  jp: {
    // Header & Navigation
    "app.title": "YieldNova",
    "app.subtitle": "DeFiプラットフォーム",
    "nav.dashboard": "ダッシュボード",
    "nav.market": "マーケット",
    "nav.package": "パッケージ",
    "nav.community": "コミュニティ",
    "nav.connect_wallet": "ウォレット接続",
    "nav.logout": "ログアウト",

    // Dashboard
    "dashboard.title": "イールドノバ デファイ",
    "dashboard.subtitle": "Web3ベースのYNVプラットフォーム。BSCブロックチェーン上のYNVトークンでスマートな収益を生み出します。バイナリ組織構造とUSDT出金システムを備えたDeFiプラットフォームです。",
    "dashboard.start_deposit": "今すぐ開始",
    "dashboard.explore_market": "相場確認",

    // Wallet
    "wallet.connected": "ウォレット接続済み",
    "wallet.connect": "ウォレット接続",
    "wallet.disconnect": "切断",
    "wallet.address": "アドレス",
    "wallet.balance": "残高",
    "wallet.insufficient": "残高不足",

    // YNV Token
    "token.ynv": "YNV",
    "token.ynv_balance": "YNV残高",
    "token.ynv_price": "YNV価格",
    "token.current_price": "現在のYNV価格",
    "token.usdt": "USDT",

    // Deposit & Level
    "deposit.title": "入金",
    "deposit.start": "入金開始",
    "deposit.amount": "入金額",
    "deposit.usdt_amount": "USDT入金額",
    "deposit.point_amount": "ポイント数",
    "deposit.before_deposit": "入金前",
    "deposit.level_up": "レベルアップ",
    "deposit.level_up_request": "レベルアップリクエスト",
    "deposit.current_level": "現在のレベル",
    "deposit.next_level": "次のレベル",
    "deposit.required_points": "必要ポイント",
    "deposit.your_points": "保有ポイント",
    "deposit.insufficient_points": "ポイント不足",
    "deposit.success": "入金完了",
    "deposit.error": "入金失敗",

    // Referral & Bonus
    "referral.title": "紹介",
    "referral.my_referral_link": "紹介リンク",
    "referral.copy_link": "リンクコピー",
    "referral.referral_count": "紹介人数",
    "referral.direct_bonus": "紹介ボーナス",
    "referral.direct_bonus_percent": "紹介ボーナス 10%",
    "referral.upline_bonus": "上位ボーナス",
    "referral.upline_bonus_percent": "8% × 10代寄付配分",
    "referral.total_bonus": "総ボーナス",

    // Organization
    "organization.title": "組織",
    "organization.binary_tree": "バイナリツリー",
    "organization.upline": "上位",
    "organization.downline": "下位",
    "organization.level": "レベル",
    "organization.members": "メンバー",

    // Withdrawal
    "withdrawal.title": "出金",
    "withdrawal.request": "出金リクエスト",
    "withdrawal.pending": "保留中",
    "withdrawal.approved": "承認済み",
    "withdrawal.rejected": "却下",
    "withdrawal.reason": "理由",
    "withdrawal.success": "出金リクエスト完了",
    "withdrawal.error": "出金失敗",

    // Admin
    "admin.title": "管理者パネル",
    "admin.access_denied": "アクセス拒否",
    "admin.admin_wallet_required": "管理者ウォレット必須",
    "admin.overview": "概要",
    "admin.price_setting": "価格設定",
    "admin.withdrawal_management": "出金管理",
    "admin.wallet_management": "ウォレット管理",
    "admin.current_ynv_price": "現在のYNV価格",
    "admin.pending_withdrawals": "保留中の出金",
    "admin.approve": "承認",
    "admin.reject": "却下",
    "admin.lock_wallet": "ウォレットロック",
    "admin.unlock_wallet": "ウォレットロック解除",
    "admin.locked_wallets": "ロック済みウォレット",

    // Common
    "common.loading": "読み込み中...",
    "common.error": "エラー",
    "common.success": "成功",
    "common.cancel": "キャンセル",
    "common.confirm": "確認",
    "common.save": "保存",
    "common.delete": "削除",
    "common.edit": "編集",
    "common.copy": "コピー",
    "common.copied": "コピー済み!",
    "common.close": "閉じる",
    "common.back": "戻る",
    "common.next": "次へ",
    "common.previous": "前へ",
  },
  cn: {
    // Header & Navigation
    "app.title": "YieldNova",
    "app.subtitle": "去中心化金融平台",
    "nav.dashboard": "仪表板",
    "nav.market": "市场",
    "nav.package": "套餐",
    "nav.community": "社区",
    "nav.connect_wallet": "连接钱包",
    "nav.logout": "登出",

    // Dashboard
    "dashboard.title": "YieldNova 去中心化金融",
    "dashboard.subtitle": "基于Web3的YNV平台。使用BSC区块链上的YNV代币创造智能收益。具有二进制组织结构和USDT提现系统的DeFi平台。",
    "dashboard.start_deposit": "立即开始",
    "dashboard.explore_market": "查看行情",

    // Wallet
    "wallet.connected": "钱包已连接",
    "wallet.connect": "连接钱包",
    "wallet.disconnect": "断开连接",
    "wallet.address": "地址",
    "wallet.balance": "余额",
    "wallet.insufficient": "余额不足",

    // YNV Token
    "token.ynv": "YNV",
    "token.ynv_balance": "YNV余额",
    "token.ynv_price": "YNV价格",
    "token.current_price": "当前YNV价格",
    "token.usdt": "USDT",

    // Deposit & Level
    "deposit.title": "存款",
    "deposit.start": "开始存款",
    "deposit.amount": "存款金额",
    "deposit.usdt_amount": "USDT存款金额",
    "deposit.point_amount": "积分数量",
    "deposit.before_deposit": "存款前",
    "deposit.level_up": "升级",
    "deposit.level_up_request": "升级请求",
    "deposit.current_level": "当前级别",
    "deposit.next_level": "下一级别",
    "deposit.required_points": "所需积分",
    "deposit.your_points": "您的积分",
    "deposit.insufficient_points": "积分不足",
    "deposit.success": "存款成功",
    "deposit.error": "存款失败",

    // Referral & Bonus
    "referral.title": "推荐",
    "referral.my_referral_link": "我的推荐链接",
    "referral.copy_link": "复制链接",
    "referral.referral_count": "推荐人数",
    "referral.direct_bonus": "推荐奖金",
    "referral.direct_bonus_percent": "推荐奖金 10%",
    "referral.upline_bonus": "上级奖金",
    "referral.upline_bonus_percent": "8% × 10代捐赠分配",
    "referral.total_bonus": "总奖金",

    // Organization
    "organization.title": "组织",
    "organization.binary_tree": "二进制树",
    "organization.upline": "上级",
    "organization.downline": "下级",
    "organization.level": "级别",
    "organization.members": "成员",

    // Withdrawal
    "withdrawal.title": "提现",
    "withdrawal.request": "提现请求",
    "withdrawal.pending": "待处理",
    "withdrawal.approved": "已批准",
    "withdrawal.rejected": "已拒绝",
    "withdrawal.reason": "原因",
    "withdrawal.success": "提现请求已提交",
    "withdrawal.error": "提现失败",

    // Admin
    "admin.title": "管理员面板",
    "admin.access_denied": "访问被拒绝",
    "admin.admin_wallet_required": "需要管理员钱包",
    "admin.overview": "概览",
    "admin.price_setting": "价格设置",
    "admin.withdrawal_management": "提现管理",
    "admin.wallet_management": "钱包管理",
    "admin.current_ynv_price": "当前YNV价格",
    "admin.pending_withdrawals": "待处理提现",
    "admin.approve": "批准",
    "admin.reject": "拒绝",
    "admin.lock_wallet": "锁定钱包",
    "admin.unlock_wallet": "解锁钱包",
    "admin.locked_wallets": "已锁定的钱包",

    // Common
    "common.loading": "加载中...",
    "common.error": "错误",
    "common.success": "成功",
    "common.cancel": "取消",
    "common.confirm": "确认",
    "common.save": "保存",
    "common.delete": "删除",
    "common.edit": "编辑",
    "common.copy": "复制",
    "common.copied": "已复制!",
    "common.close": "关闭",
    "common.back": "返回",
    "common.next": "下一步",
    "common.previous": "上一步",
  },
  vn: {
    // Header & Navigation
    "app.title": "YieldNova",
    "app.subtitle": "Nền tảng DeFi",
    "nav.dashboard": "Bảng điều khiển",
    "nav.market": "Thị trường",
    "nav.package": "Gói",
    "nav.community": "Cộng đồng",
    "nav.connect_wallet": "Kết nối Ví",
    "nav.logout": "Đăng xuất",

    // Dashboard
    "dashboard.title": "YieldNova DeFi",
    "dashboard.subtitle": "Nền tảng YNV dựa trên Web3. Tạo lợi suất thông minh với token YNV trên blockchain BSC. Nền tảng DeFi có cấu trúc tổ chức nhị phân và hệ thống rút tiền USDT.",
    "dashboard.start_deposit": "Bắt đầu ngay",
    "dashboard.explore_market": "Xem giá",

    // Wallet
    "wallet.connected": "Ví đã kết nối",
    "wallet.connect": "Kết nối Ví",
    "wallet.disconnect": "Ngắt kết nối",
    "wallet.address": "Địa chỉ",
    "wallet.balance": "Số dư",
    "wallet.insufficient": "Số dư không đủ",

    // YNV Token
    "token.ynv": "YNV",
    "token.ynv_balance": "Số dư YNV",
    "token.ynv_price": "Giá YNV",
    "token.current_price": "Giá YNV hiện tại",
    "token.usdt": "USDT",

    // Deposit & Level
    "deposit.title": "Gửi tiền",
    "deposit.start": "Bắt đầu gửi",
    "deposit.amount": "Số tiền gửi",
    "deposit.usdt_amount": "Số tiền gửi USDT",
    "deposit.point_amount": "Số điểm",
    "deposit.before_deposit": "Trước khi gửi",
    "deposit.level_up": "Nâng cấp",
    "deposit.level_up_request": "Yêu cầu nâng cấp",
    "deposit.current_level": "Cấp độ hiện tại",
    "deposit.next_level": "Cấp độ tiếp theo",
    "deposit.required_points": "Điểm cần thiết",
    "deposit.your_points": "Điểm của bạn",
    "deposit.insufficient_points": "Điểm không đủ",
    "deposit.success": "Gửi tiền thành công",
    "deposit.error": "Gửi tiền thất bại",

    // Referral & Bonus
    "referral.title": "Giới thiệu",
    "referral.my_referral_link": "Liên kết giới thiệu của tôi",
    "referral.copy_link": "Sao chép liên kết",
    "referral.referral_count": "Số người giới thiệu",
    "referral.direct_bonus": "Bonus giới thiệu",
    "referral.direct_bonus_percent": "Bonus Giới Thiệu 10%",
    "referral.upline_bonus": "Bonus cấp trên",
    "referral.upline_bonus_percent": "Phân Phối Quyên Góp 10 Tầng Mỗi Tầng 8%",
    "referral.total_bonus": "Tổng bonus",

    // Organization
    "organization.title": "Tổ chức",
    "organization.binary_tree": "Cây nhị phân",
    "organization.upline": "Cấp trên",
    "organization.downline": "Cấp dưới",
    "organization.level": "Cấp độ",
    "organization.members": "Thành viên",

    // Withdrawal
    "withdrawal.title": "Rút tiền",
    "withdrawal.request": "Yêu cầu rút tiền",
    "withdrawal.pending": "Đang chờ xử lý",
    "withdrawal.approved": "Đã phê duyệt",
    "withdrawal.rejected": "Đã từ chối",
    "withdrawal.reason": "Lý do",
    "withdrawal.success": "Yêu cầu rút tiền đã được gửi",
    "withdrawal.error": "Rút tiền thất bại",

    // Admin
    "admin.title": "Bảng điều khiển quản trị",
    "admin.access_denied": "Truy cập bị từ chối",
    "admin.admin_wallet_required": "Cần ví quản trị",
    "admin.overview": "Tổng quan",
    "admin.price_setting": "Cài đặt giá",
    "admin.withdrawal_management": "Quản lý rút tiền",
    "admin.wallet_management": "Quản lý ví",
    "admin.current_ynv_price": "Giá YNV hiện tại",
    "admin.pending_withdrawals": "Rút tiền đang chờ xử lý",
    "admin.approve": "Phê duyệt",
    "admin.reject": "Từ chối",
    "admin.lock_wallet": "Khóa ví",
    "admin.unlock_wallet": "Mở khóa ví",
    "admin.locked_wallets": "Ví đã khóa",

    // Common
    "common.loading": "Đang tải...",
    "common.error": "Lỗi",
    "common.success": "Thành công",
    "common.cancel": "Hủy",
    "common.confirm": "Xác nhận",
    "common.save": "Lưu",
    "common.delete": "Xóa",
    "common.edit": "Chỉnh sửa",
    "common.copy": "Sao chép",
    "common.copied": "Đã sao chép!",
    "common.close": "Đóng",
    "common.back": "Quay lại",
    "common.next": "Tiếp theo",
    "common.previous": "Trước đó",
  },
};

/**
 * 번역 함수
 * @param key 번역 키 (예: "nav.dashboard")
 * @param language 언어 (en | ko | jp | cn | vn)
 * @returns 번역된 텍스트
 */
export function t(key: string, language: Language = "en"): string {
  return translations[language]?.[key] || key;
}

/**
 * 지원하는 언어 목록
 */
export const supportedLanguages: Array<{ code: Language; name: string; flag: string }> = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "jp", name: "日本語", flag: "🇯🇵" },
  { code: "cn", name: "中文", flag: "🇨🇳" },
  { code: "vn", name: "Tiếng Việt", flag: "🇻🇳" },
];
