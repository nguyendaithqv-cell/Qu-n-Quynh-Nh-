import { Product, Category, Order, StoreConfig, Promotion, CustomerCookieData } from './types';

// Cookie helper funcs
export function setCustomerCookie(data: CustomerCookieData) {
  try {
    const jsonString = JSON.stringify(data);
    const date = new Date();
    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year
    const expires = "; expires=" + date.toUTCString();
    document.cookie = "bep_viet_customer=" + encodeURIComponent(jsonString) + expires + "; path=/; SameSite=Lax";
  } catch (e) {
    console.error("Failed to write customer cookie", e);
  }
}

export function getCustomerCookie(): CustomerCookieData | null {
  try {
    const nameEQ = "bep_viet_customer=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const decoded = decodeURIComponent(c.substring(nameEQ.length, c.length));
        return JSON.parse(decoded) as CustomerCookieData;
      }
    }
  } catch (e) {
    console.error("Failed to read customer cookie", e);
  }
  return null;
}

// Initial data definition
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'khai_vi', name: 'Khai Vị', icon: '🥗', sortOrder: 0, type: 'food' },
  { id: 'ca', name: 'Cá', icon: '🐟', sortOrder: 1, type: 'food' },
  { id: 'muc', name: 'Mực', icon: '🦑', sortOrder: 2, type: 'food' },
  { id: 'heo', name: 'Heo', icon: '🐖', sortOrder: 3, type: 'food' },
  { id: 'be-bo', name: 'Bê - Bò', icon: '🐂', sortOrder: 4, type: 'food' },
  { id: 'de', name: 'Dê', icon: '🐐', sortOrder: 5, type: 'food' },
  { id: 'luon', name: 'Lươn', icon: '🐍', sortOrder: 6, type: 'food' },
  { id: 'ech', name: 'Ếch', icon: '🐸', sortOrder: 7, type: 'food' },
  { id: 'tom', name: 'Tôm', icon: '🦐', sortOrder: 8, type: 'food' },
  { id: 'oc-huong', name: 'Ốc Hương', icon: '🐚', sortOrder: 9, type: 'food' },
  { id: 'lau', name: 'Lẩu', icon: '🍲', sortOrder: 10, type: 'food' },
  { id: 'com-mi-goi', name: 'Cơm - Mì - Gỏi', icon: '🍛', sortOrder: 11, type: 'food' },
  { id: 'nuong-tai-ban', name: 'Nướng Tại Bàn', icon: '🔥', sortOrder: 12, type: 'food' },
  { id: 'mon-an-kem', name: 'Món Ăn Kèm', icon: '🍚', sortOrder: 13, type: 'food' },
  { id: 'do-uong', name: 'Đồ Uống', icon: '🍺', sortOrder: 14, type: 'drink' }
];

const DEFAULT_PRODUCTS: Product[] = [
  // Khai Vị
  {
    id: 'prod-kh-1',
    name: 'Đậu Hũ Chiên Giòn',
    categoryId: 'khai_vi',
    price: 49000,
    image: '🍢',
    description: 'Đậu hũ non chiên giòn rụm bên ngoài mượt mà béo ngậy bên trong, ăn kèm tương ớt.',
    isAvailable: true
  },
  {
    id: 'prod-kh-2',
    name: 'Đậu Hũ Chiên Sả',
    categoryId: 'khai_vi',
    price: 59000,
    image: '🌾',
    description: 'Đậu hũ rán vàng thơm phủ lớp sả ớt phi vàng cay giòn mặn ngọt đậm đà.',
    isAvailable: true
  },
  {
    id: 'prod-kh-3',
    name: 'Khoai Tây Chiên',
    categoryId: 'khai_vi',
    price: 59000,
    image: '🍟',
    description: 'Khoai tây cắt lát chiên giòn rụm tơi xốp bên trong, vớt ráo dầu ăn vàng ngậy.',
    isAvailable: true
  },
  {
    id: 'prod-kh-4',
    name: 'Rau Muống Xào Tỏi',
    categoryId: 'khai_vi',
    price: 59000,
    image: '🥗',
    description: 'Rau muống non xanh mướt giòn sần sật xào cháy tỏi thơm lừng cuốn hút.',
    isAvailable: true
  },
  {
    id: 'prod-kh-5',
    name: 'Rau Luộc Kho Quẹt',
    categoryId: 'khai_vi',
    price: 79000,
    image: '🥦',
    description: 'Đĩa rau củ quả luộc tươi ngọt mát chấm nước kho quẹt đậm đặc, nhiều tóp mỡ giòn.',
    isAvailable: true
  },
  {
    id: 'prod-kh-6',
    name: 'Khô Cá Kim Chiên Giòn',
    categoryId: 'khai_vi',
    price: 119000,
    image: '🐟',
    description: 'Khô cá kim hảo hạng chiên phồng giòn tan, mồi nhắm lai rai tuyệt đỉnh.',
    isAvailable: true
  },
  {
    id: 'prod-kh-7',
    name: 'Đậu Hũ Giấy Bạc',
    categoryId: 'khai_vi',
    price: 159000,
    image: '🍲',
    description: 'Đậu hũ om trong giấy bạc nóng hổi dai mềm quyện nước sốt hải sản ngọt bùi cực ngậy.',
    isAvailable: true
  },

  // Cá
  {
    id: 'prod-ca-1',
    name: 'Cá Nướng Muối Ớt',
    categoryId: 'ca',
    price: 129000,
    image: '🐟',
    description: 'Cá tươi nướng muối ớt đỏ cay tê đậm đà ngon ngọt mọng nước từ sớ thịt.',
    isAvailable: true
  },
  {
    id: 'prod-ca-2',
    name: 'Cá Nướng Giấy Bạc',
    categoryId: 'ca',
    price: 129000,
    image: '🐠',
    description: 'Cá tươi bọc giấy bạc nướng sả ớt gừng, giữ trọn vẹn nước cá thanh ngọt tự nhiên.',
    isAvailable: true
  },
  {
    id: 'prod-ca-3',
    name: 'Cá Hấp Hồng Kông',
    categoryId: 'ca',
    price: 129000,
    image: '🍲',
    description: 'Cá hấp chuẩn vị Hồng Kông nước tương hảo vị, thơm rượi hành gừng thì là.',
    isAvailable: true
  },

  // Mực
  {
    id: 'prod-mu-1',
    name: 'Mực Chiên Nước Mắm',
    categoryId: 'muc',
    price: 139000,
    image: '🦑',
    description: 'Mực khô/tươi đảo mắm tỏi kẹo sền sệt, vị mặn mặn thơm lừng đặc sắc.',
    isAvailable: true
  },
  {
    id: 'prod-mu-2',
    name: 'Mực Chiên Giòn',
    categoryId: 'muc',
    price: 139000,
    image: '🦑',
    description: 'Mực tẩm bột khoai chiên vàng phồng giòn rụm chấm tương xốt béo ngậy cực thích.',
    isAvailable: true
  },
  {
    id: 'prod-mu-3',
    name: 'Mực Xào Sa Tế',
    categoryId: 'muc',
    price: 139000,
    image: '🌶️',
    description: 'Mực tươi giòn sần sật xào chung hành tây ớt sừng sa tế cay nồng say đắm.',
    isAvailable: true
  },
  {
    id: 'prod-mu-4',
    name: 'Mực Hấp Hành Gừng',
    categoryId: 'muc',
    price: 139000,
    image: '💨',
    description: 'Mực nháy tươi rói hấp hành tươi gừng chỉ mềm giòn, ngọt thơm mộc mạc nguyên bản.',
    isAvailable: true
  },

  // Heo
  {
    id: 'prod-he-1',
    name: 'Dồi Trường Hấp Gừng',
    categoryId: 'heo',
    price: 139000,
    image: '🥩',
    description: 'Dồi trường béo dẻo giòn sần sật hấp ấm gừng tươi chấm mắm tôm nếp sả cực mê.',
    isAvailable: true
  },
  {
    id: 'prod-he-2',
    name: 'Dồi Trường Xào Cải Chua',
    categoryId: 'heo',
    price: 139000,
    image: '🥬',
    description: 'Vị chua rôm rốp của cải dưa muối quyện lòng trường giòn ngậy thơm ngào ngạt.',
    isAvailable: true
  },
  {
    id: 'prod-he-3',
    name: 'Giò Heo Chiên Giòn',
    categoryId: 'heo',
    price: 139000,
    image: '🍖',
    description: 'Phần móng chân giò chặt khoanh chiên phồng bì giòn rạt, thịt ngọt ngậy tưng tưng.',
    isAvailable: true
  },

  // Bê Bò
  {
    id: 'prod-bo-1',
    name: 'Bò Lúc Lắc',
    categoryId: 'be-bo',
    price: 139000,
    image: '🥩',
    description: 'Bò thăn thái vuông xào cháy tỏi, hành tây xốt tiêu xì dầu mọng ngọt mềm tan.',
    isAvailable: true
  },
  {
    id: 'prod-bo-2',
    name: 'Bò Xào Hành',
    categoryId: 'be-bo',
    price: 139000,
    image: '🧅',
    description: 'Thịt bò phi lê thái lát mỏng xào chín tới cùng hành tây giòn thanh, thơm ngậy tỏi bí.',
    isAvailable: true
  },
  {
    id: 'prod-bo-3',
    name: 'Bò Cháy Tỏi',
    categoryId: 'be-bo',
    price: 139000,
    image: '🧄',
    description: 'Thịt bò tơ xào hành mầm tỏi phi giòn dậy mùi thơm lừng, món mồi đậm miệng cực bốc.',
    isAvailable: true
  },
  {
    id: 'prod-bo-4',
    name: 'Bò Nhúng Mẻ',
    categoryId: 'be-bo',
    price: 179000,
    image: '🍲',
    description: 'Thịt bò tơ nhúng lèo lẩu mẻ chua dịu mộc mạc, kèm các loại rau sông ăn kèm sảng khoái.',
    isAvailable: true
  },

  // Dê
  {
    id: 'prod-de-1',
    name: 'Dê Hấp Tía Tô',
    categoryId: 'de',
    price: 199000,
    image: '🐐',
    description: 'Thịt dê tơ mềm bọc sả tía tô bốc nghi ngút khói chao béo, chuẩn dê núi Ninh Bình.',
    isAvailable: true
  },
  {
    id: 'prod-de-2',
    name: 'Dê Xào Sả Ớt',
    categoryId: 'de',
    price: 199000,
    image: '🌶️',
    description: 'Thịt dê săn chắc nướng sém xào sả ớt phi vàng, cay nồng đậm vị núi rừng.',
    isAvailable: true
  },
  {
    id: 'prod-de-3',
    name: 'Dê Xối Sả',
    categoryId: 'de',
    price: 199000,
    image: '🌾',
    description: 'Thịt dê thái sợi chiên dội sả tơi vàng, sợi sả giòn tan nhai bùi bùi thơm bốc.',
    isAvailable: true
  },
  {
    id: 'prod-de-4',
    name: 'Dê Nhúng Mẻ',
    categoryId: 'de',
    price: 199000,
    image: '🍲',
    description: 'Dê tơ nhúng nước dùng mẻ chua béo thanh khiết thanh nhiệt sảng khoái.',
    isAvailable: true
  },

  // Lươn
  {
    id: 'prod-lu-1',
    name: 'Lươn Bằm Xúc Bánh Đa',
    categoryId: 'luon',
    price: 139000,
    image: '🥨',
    description: 'Thịt lươn đồng xào sả ớt thơm lốt xúc cùng bánh đa nướng giòn rụm béo bùi.',
    isAvailable: true
  },
  {
    id: 'prod-lu-2',
    name: 'Lươn Hấp',
    categoryId: 'luon',
    price: 139000,
    image: '🍲',
    description: 'Lươn nguyên con hấp lá ngải hoặc lá giang nóng thơm thanh ngọt bổ khí sinh lực.',
    isAvailable: true
  },
  {
    id: 'prod-lu-3',
    name: 'Lươn Xào Sả Ớt',
    categoryId: 'luon',
    price: 139000,
    image: '🌶️',
    description: 'Lươn cắt lóng chiên xém xào sả ớt vàng cay xộc kích thích thính giác cực mồi.',
    isAvailable: true
  },

  // Ếch
  {
    id: 'prod-ec-1',
    name: 'Ếch Xào Sả Ớt',
    categoryId: 'ech',
    price: 129000,
    image: '🐸',
    description: 'Đùi ếch đồng săn chắc dai ngọt xào sả tỏi ớt băm nhuyễn vàng ruộm cực đưa mồi.',
    isAvailable: true
  },

  // Tôm
  {
    id: 'prod-to-1',
    name: 'Tôm Chiên Giòn',
    categoryId: 'tom',
    price: 139000,
    image: '🦐',
    description: 'Tôm sú tươi nhảy tanh tách chiên mọi ăn nguyên vỏ mặn mặn giòn giòn ngọt lịm.',
    isAvailable: true
  },
  {
    id: 'prod-to-2',
    name: 'Tôm Chiên Xù',
    categoryId: 'tom',
    price: 139000,
    image: '🍤',
    description: 'Tôm nõn bọc bột chiên xù xốp giòn tan lôi cuốn, các bé nhỏ ríu rít thích mê.',
    isAvailable: true
  },
  {
    id: 'prod-to-3',
    name: 'Tôm Rang Me',
    categoryId: 'tom',
    price: 139000,
    image: '🧉',
    description: 'Tôm ngọt lịm đẫm xốt me vắt chua thanh đậm đặc sánh óng ả tuyệt vời.',
    isAvailable: true
  },
  {
    id: 'prod-to-4',
    name: 'Tôm Chiên Tỏi',
    categoryId: 'tom',
    price: 139000,
    image: '🧄',
    description: 'Tôm chiên bơ tỏi thơm ngào ngạt nịnh mũi xộc miệng cực đã.',
    isAvailable: true
  },
  {
    id: 'prod-to-5',
    name: 'Tôm Rang Muối',
    categoryId: 'tom',
    price: 139000,
    image: '🧂',
    description: 'Tôm sú rang với bột muối gia truyền giòn rụm béo bùi, vừa ăn vừa nhấm bia mát lạnh.',
    isAvailable: true
  },
  {
    id: 'prod-to-6',
    name: 'Tôm Mù Tạt',
    categoryId: 'tom',
    price: 139000,
    image: '🟢',
    description: 'Tôm sống gỏi tươi tái chanh sốt wasabi mù tạt cực kích thích thông mũi sảng khoái.',
    isAvailable: true
  },

  // Ốc Hương
  {
    id: 'prod-oc-1',
    name: 'Ốc Hương Rang Me',
    categoryId: 'oc-huong',
    price: 139000,
    image: '🐚',
    description: 'Ốc hương lớn ngọt thịt xào xốt me dẻo quẹo, mút mát lớp vỏ chua cay béo ngọt.',
    isAvailable: true
  },
  {
    id: 'prod-oc-2',
    name: 'Ốc Hương Rang Muối',
    categoryId: 'oc-huong',
    price: 139000,
    image: '🧂',
    description: 'Ốc hương muối kéo tơ mặn mòi sa tế ớt giòn ngọt, vỏ ốc phủ lớp muối tuyệt hảo.',
    isAvailable: true
  },
  {
    id: 'prod-oc-3',
    name: 'Ốc Hương Cháy Tỏi',
    categoryId: 'oc-huong',
    price: 139000,
    image: '🧄',
    description: 'Ốc hương rang cháy tỏi phi thơm ngây vàng ruộm tột đỉnh nhắm nháp ngày mưa.',
    isAvailable: true
  },
  {
    id: 'prod-oc-4',
    name: 'Ốc Hương Sốt Trứng Muối',
    categoryId: 'oc-huong',
    price: 159000,
    image: '🥚',
    description: 'Ốc giòn quyện xốt trứng muối tán mịn béo bùi ngậy sền sệt chấm bánh mì nóng siêu cuốn.',
    isAvailable: true
  },

  // Lẩu
  {
    id: 'prod-la-1',
    name: 'Lẩu Thái Hải Sản',
    categoryId: 'lau',
    price: 199000,
    image: '🍲',
    description: 'Nước lẩu Thái chua cay đẫm nước dừa và thảo mộc, đĩa hải sản tôm mực đầy ắp nhúng sướng.',
    isAvailable: true
  },
  {
    id: 'prod-la-2',
    name: 'Lẩu Hải Sản',
    categoryId: 'lau',
    price: 199000,
    image: '🍲',
    description: 'Nước lẩu ngọt cốt xương heo ninh nhúng dồi dào tôm sú, mực nháy tươi ngọt lịm.',
    isAvailable: true
  },
  {
    id: 'prod-la-3',
    name: 'Lẩu Cua Đồng',
    categoryId: 'lau',
    price: 199000,
    image: '🦀',
    description: 'Gạch cua đồng lèo sền rụm riêu cua vàng nổi lềnh bềnh, kèm sườn sụn bò nhúng tuyệt cú mèo.',
    isAvailable: true
  },
  {
    id: 'prod-la-4',
    name: 'Lẩu Lươn',
    categoryId: 'lau',
    price: 199000,
    image: '🐍',
    description: 'Món ăn đặc sản Nam Bộ thơm rượi lá giang chua dịu ăn cùng lươn tươi đồng cắt khúc.',
    isAvailable: true
  },
  {
    id: 'prod-la-5',
    name: 'Lẩu Ếch',
    categoryId: 'lau',
    price: 199000,
    image: '🐸',
    description: 'Thịt ếch đồng xào măng chua cay nhúng lẩu sành điệu giòn tan mọng ngọt cực hợp trời lạnh.',
    isAvailable: true
  },
  {
    id: 'prod-la-6',
    name: 'Lẩu Gà',
    categoryId: 'lau',
    price: 199000,
    image: '🐔',
    description: 'Gà ta thả đồi thơm lộc ninh nấm củ quả bổ thanh dưỡng mát dồi dào sinh khí.',
    isAvailable: true
  },
  {
    id: 'prod-la-7',
    name: 'Lẩu Đuôi Bò',
    categoryId: 'lau',
    price: 199000,
    image: '🐂',
    description: 'Đuôi bò hầm sả kỷ tử ngọt thơm dậy mùi thuốc bắc béo giòn bùi nồng nàn.',
    isAvailable: true
  },
  {
    id: 'prod-la-8',
    name: 'Lẩu Dê',
    categoryId: 'lau',
    price: 199000,
    image: '🐐',
    description: 'Lẩu dê tơ hầm nhừ ngũ vị chao béo, khoai môn sáp bùi, đậu hũ ki chiên lôi cuốn.',
    isAvailable: true
  },
  {
    id: 'prod-la-9',
    name: 'Lẩu Cá Chép Giòn',
    categoryId: 'lau',
    price: 199000,
    image: '🐟',
    description: 'Lát mỏng cá chép giòn dai tưng bừng nhúng riêu khế chua mộc mạc thơm ngào ngạt.',
    isAvailable: true
  },

  // Cơm Mì Gỏi
  {
    id: 'prod-cm-1',
    name: 'Cơm Chiên Dương Châu',
    categoryId: 'com-mi-goi',
    price: 79000,
    image: '🍛',
    description: 'Cơm chiên hạt tơi săn đầy màu sắc lạp xưởng xắt viên dưa lèo cà rốt béo thơm.',
    isAvailable: true
  },
  {
    id: 'prod-cm-2',
    name: 'Cơm Chiên Hải Sản',
    categoryId: 'com-mi-goi',
    price: 79000,
    image: '🍛',
    description: 'Cơm chiên giòn cháy sém đảo cùng vảy tôm sú mực nang xắt nhỏ giòn béo bùi.',
    isAvailable: true
  },
  {
    id: 'prod-cm-3',
    name: 'Cơm Chiên Cá Mặn',
    categoryId: 'com-mi-goi',
    price: 79000,
    image: '🍛',
    description: 'Sự kết hợp tinh túy từ thịt cá mặn đượm hương vị chảo cháy xém đưa cơm tột độ.',
    isAvailable: true
  },
  {
    id: 'prod-cm-4',
    name: 'Mì Xào Bò',
    categoryId: 'com-mi-goi',
    price: 79000,
    image: '🍝',
    description: 'Mì gói nhúng dai xào thịt thăn bò ướp tỏi xắt mỏng giòn tơi cải thìa ngọt mát.',
    isAvailable: true
  },
  {
    id: 'prod-cm-5',
    name: 'Mì Xào Hải Sản',
    categoryId: 'com-mi-goi',
    price: 79000,
    image: '🍜',
    description: 'Mì xào tơi thơm nóng kèm tôm mực nghêu hành rau xào tái nhanh ngọt béo.',
    isAvailable: true
  },
  {
    id: 'prod-cm-6',
    name: 'Gỏi Bò',
    categoryId: 'com-mi-goi',
    price: 129000,
    image: '🥗',
    description: 'Bò bóp thấu tái chanh, hành tây muối chua ngọt hạt điều vừng răng bùi đưa mồi cay tê.',
    isAvailable: true
  },
  {
    id: 'prod-cm-7',
    name: 'Gỏi Hải Sản',
    categoryId: 'com-mi-goi',
    price: 129000,
    image: '🥗',
    description: 'Tôm mực chín phối ngó sen tai dưa dấm chua thơm nước mắm tỏi ớt tuyệt mồi.',
    isAvailable: true
  },
  {
    id: 'prod-cm-8',
    name: 'Gỏi Sứa',
    categoryId: 'com-mi-goi',
    price: 129000,
    image: '🥗',
    description: 'Món biển mát lạnh với sửa giòn hực hực hòa cùng dừa bào sợi mắm cốt ngào ngạt.',
    isAvailable: true
  },
  {
    id: 'prod-cm-9',
    name: 'Gỏi Tôm Thịt',
    categoryId: 'com-mi-goi',
    price: 129000,
    image: '🥗',
    description: 'Tôm sú đỏ lột vỏ và thịt ba rọi mềm ngậy quyện ngó sen rau dừa thanh đượm.',
    isAvailable: true
  },

  // Nướng Tại Bàn
  {
    id: 'prod-nu-1',
    name: 'Ba Chỉ Heo Nướng',
    categoryId: 'nuong-tai-ban',
    price: 139000,
    image: '🥓',
    description: 'Ba chỉ heo bản dày ướp nghệ sả xốt mật ong mộc mạc cháy xèo xèo vàng thơm lung linh.',
    isAvailable: true
  },
  {
    id: 'prod-nu-2',
    name: 'Vú Heo Nướng',
    categoryId: 'nuong-tai-ban',
    price: 139000,
    image: '🥩',
    description: 'Nầm sữa non (vú heo) nướng giòn nhai bùi ngậy ướp ngũ vị sa tế cay tê đốn tim.',
    isAvailable: true
  },
  {
    id: 'prod-nu-3',
    name: 'Bò Nướng',
    categoryId: 'nuong-tai-ban',
    price: 139000,
    image: '🍖',
    description: 'Bò phile ướp tỏi xốt nướng dầu hào hành ta nướng ngậy lôi cuốn cuộn xà lách.',
    isAvailable: true
  },
  {
    id: 'prod-nu-4',
    name: 'Tôm Nướng',
    categoryId: 'nuong-tai-ban',
    price: 139000,
    image: '🦐',
    description: 'Tôm sú xiên que tre nướng mọi rực rỡ thơm hương đất trời ngọt ngào nguyên bản.',
    isAvailable: true
  },
  {
    id: 'prod-nu-5',
    name: 'Mực Nướng',
    categoryId: 'nuong-tai-ban',
    price: 139000,
    image: '🦑',
    description: 'Mực tươi nguyên bản nướng muối sả rát vàng ươm mặn cay cực dính.',
    isAvailable: true
  },
  {
    id: 'prod-nu-6',
    name: 'Dê Nướng',
    categoryId: 'nuong-tai-ban',
    price: 179000,
    image: '🐐',
    description: 'Dê núi xiên tỏi tía tô nướng lụi gắp than mềm mại đậm chao bốc lộc ngào ngạt.',
    isAvailable: true
  },

  // Món ăn kèm
  {
    id: 'prod-ak-1',
    name: 'Cơm Trắng',
    categoryId: 'mon-an-kem',
    price: 12000,
    image: '🍚',
    description: 'Bát cơm trắng dẻo thơm hạt gạo tám dẻo dai bùi béo ăn kèm.',
    isAvailable: true
  },
  {
    id: 'prod-ak-2',
    name: 'Bún Tươi',
    categoryId: 'mon-an-kem',
    price: 15000,
    image: '🍜',
    description: 'Đĩa bún sợi mát dẻo thơm nếp xắt nhỏ chan canh lẩu tuyệt vời.',
    isAvailable: true
  },
  {
    id: 'prod-ak-3',
    name: 'Mì Gói Trứng',
    categoryId: 'mon-an-kem',
    price: 25000,
    image: '🍳',
    description: 'Gói mì ăn liền hảo hảo kèm quả trứng gà đỏ trần nóng bốc.',
    isAvailable: true
  },

  // Đồ Uống
  {
    id: 'prod-du-1',
    name: 'Bia Sài Gòn Lager',
    categoryId: 'do-uong',
    price: 14000,
    image: '🍺',
    description: 'Bia chai/lon Sài Gòn xanh lục mát lạnh, vị men êm đềm dạt dào sảng khoái.',
    isAvailable: true
  },
  {
    id: 'prod-du-2',
    name: 'Bia Việt',
    categoryId: 'do-uong',
    price: 14000,
    image: '🍻',
    description: 'Men bia thuần chất tinh hoa Việt nhẹ dạt sảng khoái say nồng thắm thiết.',
    isAvailable: true
  },
  {
    id: 'prod-du-3',
    name: 'Bia Tiger Nâu',
    categoryId: 'do-uong',
    price: 18000,
    image: '🍺',
    description: 'Lon bia Tiger truyền thống đậm chất mãnh hổ, say bốc lôi cuốn.',
    isAvailable: true
  },
  {
    id: 'prod-du-4',
    name: 'Bia Tiger Bạc',
    categoryId: 'do-uong',
    price: 20000,
    image: '🍺',
    description: 'Tiger Crystal tinh khiết nhẹ êm như tuyết sủi bọt ngập cốc đá.',
    isAvailable: true
  },
  {
    id: 'prod-du-5',
    name: 'Bia Ken Lùn',
    categoryId: 'do-uong',
    price: 18000,
    image: '🍺',
    description: 'Bia Heineken lon lùn sành điệu tinh tế, vị bia danh tiếng toàn cầu bừng sảng khoái.',
    isAvailable: true
  },
  {
    id: 'prod-du-6',
    name: 'Bia Bồng',
    categoryId: 'do-uong',
    price: 30000,
    image: '🍻',
    description: 'Bia bồng bình dạt dào bọt sủi, lôi cuốn dồi dào chuẩn phong cách dzo hò.',
    isAvailable: true
  },
  {
    id: 'prod-du-7',
    name: 'Rượu',
    categoryId: 'do-uong',
    price: 20000,
    image: '🍶',
    description: 'Rượu gạo nếp chưng cất thủ công truyền thống nồng ấm êm dịu sảng khoái.',
    isAvailable: true
  },
  {
    id: 'prod-du-8',
    name: 'Nước Ngọt',
    categoryId: 'do-uong',
    price: 12000,
    image: '🥤',
    description: 'Coca, Pepsi, Mirinda sủi bọt mát lạnh gas bừng tỉnh thỏa sức say mê.',
    isAvailable: true
  }
];

const DEFAULT_PROMOTIONS: Promotion[] = [
  { id: 'promo-1', code: 'FREE_SHIP', type: 'fixed', value: 25000, minOrderValue: 120000, isActive: true },
  { id: 'promo-2', code: 'GIAM10_LAU', type: 'percentage', value: 10, minOrderValue: 150000, isActive: true },
  { id: 'promo-3', code: 'KHAIVI2026', type: 'fixed', value: 30000, minOrderValue: 200000, isActive: true }
];

const DEFAULT_STORE_CONFIG: StoreConfig = {
  name: "Quán Nhậu KHAI VỊ",
  address: "Phố Ẩm Thực Long Biên, 12 Cổ Linh, Quận Long Biên, Hà Nội",
  phone: "0969320229",
  zaloHotline: "0969320229",
  bankName: "Ngân hàng Ngoại Thương Việt Nam (Vietcombank)",
  bankAccount: "1023456789",
  bankAccountName: "NGUYEN VAN BEP VIET",
  openHours: "10:00 - 23:30",
  customQrCodeUrl: "",
  theme: "standard"
};

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'order-1',
    billCode: 'KV-2026521A',
    customerName: 'Anh Hoàng Tuấn',
    customerPhone: '0912345678',
    customerAddress: 'Bàn số 6 - Phòng Thượng hạng',
    paymentMethod: 'banking',
    items: [
      { productId: 'prod-la-1', productName: 'Lẩu Thái Hải Sản', quantity: 1, priceOnOrder: 199000 },
      { productId: 'prod-bo-1', productName: 'Bò Lúc Lắc', quantity: 1, priceOnOrder: 139000 },
      { productId: 'prod-du-4', productName: 'Bia Tiger Bạc', quantity: 6, priceOnOrder: 20000 }
    ],
    subTotal: 458000,
    discountAmount: 45800,
    totalAmount: 412200,
    promoCodeUsed: 'GIAM10_LAU',
    status: 'completed',
    paymentStatus: 'paid',
    createdAt: '2026-05-21T02:30:00Z',
    note: 'Cho nhiều nước chao và bún cua.'
  },
  {
    id: 'order-2',
    billCode: 'KV-2026521B',
    customerName: 'Trần Văn Bảo',
    customerPhone: '0938887766',
    customerAddress: 'Số 45 Hẻm Ngõ Cổ Linh, Long Biên',
    paymentMethod: 'cod',
    items: [
      { productId: 'prod-kh-5', productName: 'Rau Luộc Kho Quẹt', quantity: 1, priceOnOrder: 79000 },
      { productId: 'prod-du-6', productName: 'Bia Bồng', quantity: 2, priceOnOrder: 30000 }
    ],
    subTotal: 139000,
    discountAmount: 25000,
    totalAmount: 114000,
    promoCodeUsed: 'FREE_SHIP',
    status: 'preparing',
    paymentStatus: 'unpaid',
    createdAt: '2026-05-21T05:45:00Z',
    note: 'Giao gấp mồi nhậu bóng đá ạ!'
  },
  {
    id: 'order-3',
    billCode: 'KV-2026521C',
    customerName: 'Lê Hoàng Minh',
    customerPhone: '0977654321',
    customerAddress: 'Bàn 12 - Tầng Trệt Sân Vườn',
    paymentMethod: 'banking',
    items: [
      { productId: 'prod-oc-4', productName: 'Ốc Hương Sốt Trứng Muối', quantity: 2, priceOnOrder: 159000 },
      { productId: 'prod-ak-1', productName: 'Cơm Trắng', quantity: 1, priceOnOrder: 12000 }
    ],
    subTotal: 330000,
    discountAmount: 30000,
    totalAmount: 300000,
    promoCodeUsed: 'KHAIVI2026',
    status: 'delivering',
    paymentStatus: 'unpaid',
    createdAt: '2026-05-21T06:15:00Z',
    note: 'Cho nóng nhiều bánh mì ăn kèm sốt trứng muối.'
  }
];

export function getInitialData() {
  const getOrSet = (key: string, defaultData: any) => {
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        return JSON.parse(existing);
      } catch (e) {
        console.error(`Error parsing localStorage key ${key}`, e);
      }
    }
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  };

  return {
    categories: getOrSet('bv_categories_v2', DEFAULT_CATEGORIES) as Category[],
    products: getOrSet('bv_products_v2', DEFAULT_PRODUCTS) as Product[],
    promotions: getOrSet('bv_promotions_v2', DEFAULT_PROMOTIONS) as Promotion[],
    storeConfig: getOrSet('bv_store_config_v2', DEFAULT_STORE_CONFIG) as StoreConfig,
    orders: getOrSet('bv_orders_v2', DEFAULT_ORDERS) as Order[]
  };
}

export function saveToLocalStorage(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to localStorage key ${key}`, e);
  }
}
