
import { BlogPost, UserRole, User, Category } from '../types';

export const MOCK_USER: User = {
  id: 'u1',
  username: 'AdminUser', // 您的笔名
  role: UserRole.ADMIN,
  // 您可以将头像图片放在 public/avatar.jpg，然后在这里写 '/avatar.jpg'
  avatarUrl: 'https://ui-avatars.com/api/?name=Ancient+Path&background=0D8ABC&color=fff'
};

export const INITIAL_CATEGORIES: Category[] = [
  // { id: 'c1', name: '教义', parentId: null },
  // { id: 'c2', name: '基督论', parentId: 'c1' },
  // { id: 'c3', name: '救恩论', parentId: 'c1' },
  // { id: 'c4', name: '基督徒生活', parentId: null },
  // { id: 'c5', name: '祷告', parentId: 'c4' },
  // { id: 'c6', name: '家庭', parentId: 'c4' },
  // { id: 'c7', name: '教会历史', parentId: null },
  // 添加新分类：复制上面一行，修改 id 和 name 即可
];

/**
 * 🟢 如何添加新文章 (Git 模式):
 * 
 * 1. 图片上传: 将图片文件(例如 church.jpg)放入项目的 public/ 文件夹中。
 *    在代码中引用时，直接写文件名: '/church.jpg'
 * 
 * 2. 音频上传: 将音频文件(例如 sermon.mp3)放入 public/ 文件夹中。
 *    引用: '/sermon.mp3'
 * 
 * 3. 复制下方的对象结构，粘贴到 INITIAL_POSTS 数组的最上方。
 */

export const INITIAL_POSTS: BlogPost[] = [
  // === 在这里添加新文章 ===
  // {
  //   id: 'new-post-1', // 唯一的ID，不要重复
  //   title: '这里写标题',
  //   excerpt: '这里写简短的摘要，显示在卡片上。',
  //   content: `# 文章标题
  //
  //   这里使用 Markdown 格式写正文。
  //   **加粗**，*斜体*。
  //   `,
  //   coverImage: 'https://picsum.photos/800/400', // 或者使用本地图片: '/my-image.jpg'
  //   author: MOCK_USER,
  //   createdAt: Date.now(), // 或者写具体的毫秒时间戳
  //   categoryId: 'c1', // 对应上面的分类 ID
  //   tags: ['标签1', '标签2'],
  //   views: 0,
  //   isFeatured: true, // 是否在首页轮播图显示
  //   // audioUrl: '/my-sermon.mp3' // 可选：如果有音频
  // },
  
  // {
//     id: '1',
//     title: '唯独恩典：改革宗信仰的核心',
//     excerpt: '在救恩的事上，人完全是被动的，完全是上帝恩典的工作。',
//     content: `# 唯独恩典 (Sola Gratia)

// 我们得救是本乎恩，也因着信。这并不是出于自己，乃是上帝所赐的。

// ## 人的全然败坏

// 自从亚当堕落以来，人就死在过犯罪恶之中...

// ## 无条件的拣选

// 上帝在创立世界以前，在基督里拣选了我们...
//     `,
//     coverImage: 'https://picsum.photos/800/400?random=1',
//     author: MOCK_USER,
//     createdAt: Date.now() - 86400000 * 2,
//     categoryId: 'c3', // 救恩论
//     tags: ['恩典', '五大唯独', '多特信经'],
//     views: 1540,
//     isFeatured: true,
//     audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Sample audio
//   },
//   {
//     id: '2',
//     title: '海德堡要理问答第一问',
//     excerpt: '你唯一的安慰是什么？',
//     content: `# 第一问

// **问：** 你在生与死之间，唯一的安慰是什么？

// **答：** 在生与死之间，我的身体、灵魂都不属于我自己，乃是属于我信实的救主耶稣基督...
//     `,
//     coverImage: 'https://picsum.photos/800/400?random=2',
//     author: MOCK_USER,
//     createdAt: Date.now() - 86400000 * 5,
//     categoryId: 'c1', // 教义
//     tags: ['海德堡', '安慰', '教理问答'],
//     views: 920,
//     isFeatured: false
//   },
//   {
//     id: '3',
//     title: '属灵的祷告',
//     excerpt: '如何在圣灵里祷告，寻求上帝的面。',
//     content: `# 祷告的真谛

// 祷告不是为了改变上帝的旨意，而是为了顺服祂的旨意。
//     `,
//     coverImage: 'https://picsum.photos/800/400?random=3',
//     author: MOCK_USER,
//     createdAt: Date.now() - 86400000 * 10,
//     categoryId: 'c5', // 祷告
//     tags: ['灵修', '祷告'],
//     views: 3100,
//     isFeatured: true
//   },
//   {
//     id: '4',
//     title: '早期教会的逼迫',
//     excerpt: '鲜血是福音的种子。',
//     content: '早期教会在罗马帝国的压迫下反而更加兴旺...',
//     coverImage: 'https://picsum.photos/800/400?random=4',
//     author: MOCK_USER,
//     createdAt: Date.now() - 86400000 * 12,
//     categoryId: 'c7',
//     tags: ['历史', '殉道'],
//     views: 450,
//     isFeatured: false
//   },
//   {
//     id: '5',
//     title: '建立家庭祭坛',
//     excerpt: '父亲作为家庭祭司的责任。',
//     content: '家庭敬拜是信仰传承的关键...',
//     coverImage: 'https://picsum.photos/800/400?random=5',
//     author: MOCK_USER,
//     createdAt: Date.now() - 86400000 * 15,
//     categoryId: 'c6',
//     tags: ['家庭', '敬拜'],
//     views: 600,
//     isFeatured: false
//   },
//   {
//     id: '6',
//     title: '基督的二性',
//     excerpt: '完全的神，完全的人。',
//     content: '迦克墩信经确立了基督神人二性不混合、不改变、不分割、不离散...',
//     coverImage: 'https://picsum.photos/800/400?random=6',
//     author: MOCK_USER,
//     createdAt: Date.now() - 86400000 * 16,
//     categoryId: 'c2',
//     tags: ['基督论', '信经'],
//     views: 780,
//     isFeatured: true
//   }
];
