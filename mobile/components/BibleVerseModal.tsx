import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, Pressable, Alert, TextInput } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getVerses, BibleVerse, BibleVersionKey, setActiveBibleVersion, getActiveBibleVersion, parseVerseLection } from '../services/BibleDatabase';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NCV_UNLOCK_KEY = 'ncv_unlocked';

interface BibleVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: string; // e.g., "太3:16" or "路1:3-6"
  version?: BibleVersionKey;
  onVersionChange?: (version: BibleVersionKey) => void;
}

// 书卷简称到ID的映射
const BOOK_NAME_MAP: Record<string, number> = {
  // 新约
  '太': 40, '马太福音': 40,
  '可': 41, '马可福音': 41,
  '路': 42, '路加福音': 42,
  '约': 43, '约翰福音': 43,
  '徒': 44, '使徒行传': 44,
  '罗': 45, '罗马书': 45,
  '林前': 46, '哥林多前书': 46,
  '林后': 47, '哥林多后书': 47,
  '加': 48, '加拉太书': 48,
  '弗': 49, '以弗所书': 49,
  '腓': 50, '腓立比书': 50,
  '西': 51, '歌罗西书': 51,
  '帖前': 52, '帖撒罗尼迦前书': 52,
  '帖后': 53, '帖撒罗尼迦后书': 53,
  '提前': 54, '提摩太前书': 54,
  '提后': 55, '提摩太后书': 55,
  '多': 56, '提多书': 56,
  '门': 57, '腓利门书': 57,
  '来': 58, '希伯来书': 58,
  '雅': 59, '雅各书': 59,
  '彼前': 60, '彼得前书': 60,
  '彼后': 61, '彼得后书': 61,
  '约一': 62, '约翰一书': 62, '约壹': 62,
  '约二': 63, '约翰二书': 63, '约贰': 63,
  '约三': 64, '约翰三书': 64, '约叁': 64,
  '犹': 65, '犹大书': 65,
  '启': 66, '启示录': 66,
  // 旧约
  '创': 1, '创世记': 1,
  '出': 2, '出埃及记': 2,
  '利': 3, '利未记': 3,
  '民': 4, '民数记': 4,
  '申': 5, '申命记': 5,
  '书': 6, '约书亚记': 6,
  '士': 7, '士师记': 7,
  '得': 8, '路得记': 8,
  '撒上': 9, '撒母耳记上': 9,
  '撒下': 10, '撒母耳记下': 10,
  '王上': 11, '列王纪上': 11,
  '王下': 12, '列王纪下': 12,
  '代上': 13, '历代志上': 13,
  '代下': 14, '历代志下': 14,
  '拉': 15, '以斯拉记': 15,
  '尼': 16, '尼希米记': 16,
  '斯': 17, '以斯帖记': 17,
  '伯': 18, '约伯记': 18,
  '诗': 19, '诗篇': 19,
  '箴': 20, '箴言': 20,
  '传': 21, '传道书': 21,
  '歌': 22, '雅歌': 22,
  '赛': 23, '以赛亚书': 23,
  '耶': 24, '耶利米书': 24,
  '哀': 25, '耶利米哀歌': 25,
  '结': 26, '以西结书': 26,
  '但': 27, '但以理书': 27,
  '何': 28, '何西阿书': 28,
  '珥': 29, '约珥书': 29,
  '摩': 30, '阿摩司书': 30,
  '俄': 31, '俄巴底亚书': 31,
  '拿': 32, '约拿书': 32,
  '弥': 33, '弥迦书': 33,
  '鸿': 34, '那鸿书': 34,
  '哈': 35, '哈巴谷书': 35,
  '番': 36, '西番雅书': 36,
  '该': 37, '哈该书': 37,
  '亚': 38, '撒迦': 38, '撒迦利亚书': 38,
  '玛': 39, '玛拉基书': 39,
  
};

// ID到书卷名的映射（用于显示）
const BOOK_ID_TO_NAME: Record<number, string> = {
  1: '创世记', 2: '出埃及记', 3: '利未记', 4: '民数记', 5: '申命记',
  6: '约书亚记', 7: '士师记', 8: '路得记', 9: '撒母耳上', 10: '撒母耳下',
  11: '列王纪上', 12: '列王纪下', 13: '历代志上', 14: '历代志下', 15: '以斯拉记',
  16: '尼希米记', 17: '以斯帖记', 18: '约伯记', 19: '诗篇', 20: '箴言',
  21: '传道书', 22: '雅歌', 23: '以赛亚书', 24: '耶利米书', 25: '耶利米哀歌',
  26: '以西结书', 27: '但以理书', 28: '何西阿书', 29: '约珥书', 30: '阿摩司书',
  31: '俄巴底亚书', 32: '约拿书', 33: '弥迦书', 34: '那鸿书', 35: '哈巴谷书',
  36: '西番雅书', 37: '哈该书', 38: '撒迦利亚书', 39: '玛拉基书', 40: '马太福音',
  41: '马可福音', 42: '路加福音', 43: '约翰福音', 44: '使徒行传', 45: '罗马书',
  46: '哥林多前书', 47: '哥林多后书', 48: '加拉太书', 49: '以弗所书', 50: '腓立比书',
  51: '歌罗西书', 52: '帖撒罗尼迦前书', 53: '帖撒罗尼迦后书', 54: '提摩太前书',
  55: '提摩太后书', 56: '提多书', 57: '腓利门书', 58: '希伯来书', 59: '雅各书',
  60: '彼得前书', 61: '彼得后书', 62: '约翰一书', 63: '约翰二书', 64: '约翰三书',
  65: '犹大书', 66: '启示录',
};

const BibleVerseModal = React.memo<BibleVerseModalProps>(({ 
  isOpen, 
  onClose, 
  reference,
  version = 'cuv',
  onVersionChange
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState(0);
  const [startVerse, setStartVerse] = useState(0);
  const [endVerse, setEndVerse] = useState(0);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [ncvUnlocked, setNcvUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // 加载新译本解锁状态
  useEffect(() => {
    AsyncStorage.getItem(NCV_UNLOCK_KEY).then(value => {
      setNcvUnlocked(value === 'true');
    });
  }, []);

  const availableVersions = useMemo(() => {
    const versions = [
      { key: 'cuv' as BibleVersionKey, label: '和合本' },
      { key: 'bilingual' as BibleVersionKey, label: '中英对照' },
      { key: 'asv' as BibleVersionKey, label: '美标本' },
    ];
    if (ncvUnlocked) {
      versions.push({ key: 'ncv' as BibleVersionKey, label: '新译本' });
    }
    return versions;
  }, [ncvUnlocked]);

  const handlePasswordSubmit = useCallback(async () => {
    if (passwordInput === '3927') {
      setNcvUnlocked(true);
      await AsyncStorage.setItem(NCV_UNLOCK_KEY, 'true');
      setShowPasswordModal(false);
      setPasswordInput('');
      Alert.alert('解锁成功', '新译本已启用');
    } else {
      Alert.alert('密码错误', '请输入正确的口令');
      setPasswordInput('');
    }
  }, [passwordInput]);

  // 解析经文引用，如 "太3:16"、"路1:3-6"、"创3"、"《传道书》4章 9 节"
  const parseReference = (ref: string): { bookId: number | null; chapter: number; startVerse: number | null; endVerse: number | null } | null => {
    // 移除括号与书名号
    const cleanRef = ref.replace(/[《》【】\[\]()（）]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanRef) return null;

    // 优先匹配：书卷 + 章:节(-节)
    let match = cleanRef.match(/^([^:0-9]+?)\s*(\d+)\s*[:：]\s*(\d+)(?:\s*-\s*(\d+))?$/);
    if (match) {
      const bookNamePart = match[1].trim();
      const chap = parseInt(match[2], 10);
      const startVers = parseInt(match[3], 10);
      const endVers = match[4] ? parseInt(match[4], 10) : startVers;
      const bookId = BOOK_NAME_MAP[bookNamePart];
      if (!bookId) return null;
      return { bookId, chapter: chap, startVerse: startVers, endVerse: endVers };
    }

    // 匹配：书卷 + 章(第)? + 节(第)?，节可选
    match = cleanRef.match(/^([^:0-9]+?)\s*第?\s*(\d+)\s*(?:章)?\s*(?:第?\s*(\d+)\s*(?:节)?)?\s*(?:-\s*(\d+)\s*节?)?$/);
    if (!match) return null;

    const bookNamePart = match[1].trim();
    const chap = parseInt(match[2], 10);
    const startVers = match[3] ? parseInt(match[3], 10) : null;
    const endVers = match[4] ? parseInt(match[4], 10) : startVers;

    const bookId = BOOK_NAME_MAP[bookNamePart];
    if (!bookId) return null;

    return { bookId, chapter: chap, startVerse: startVers, endVerse: endVers };
  };

  // 加载经文
  useEffect(() => {
    if (!isOpen || !reference) return;

    const loadVerses = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const parsed = parseReference(reference);
        if (!parsed) {
          setError('无法解析经文引用');
          return;
        }

        const { bookId, chapter: chap, startVerse: startV, endVerse: endV } = parsed;
        
        if (!bookId) {
          setError('无法找到书卷');
          return;
        }
        
        setChapter(chap);
        setBookName(BOOK_ID_TO_NAME[bookId] || '');

        // 切换到正确的圣经版本
        await setActiveBibleVersion(version);
        
        const fetchedVerses = await getVerses(bookId, chap);
        setVerses(fetchedVerses);

        if (startV === null) {
          // 仅章节：展示整章
          const maxVerse = fetchedVerses.reduce((max, v) => Math.max(max, v.VerseSN), 0);
          setStartVerse(1);
          setEndVerse(maxVerse || 1);
        } else {
          setStartVerse(startV);
          setEndVerse(endV ?? startV);
        }
      } catch (err) {
        setError('加载经文失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadVerses();
  }, [isOpen, reference, version]);

  const handleCopy = useCallback(async () => {
    const text = verses
      .filter(v => v.VerseSN >= startVerse && v.VerseSN <= endVerse)
      .map(v => {
        const parsed = parseVerseLection(v.Lection);
        if (parsed.hasBilingual) {
          return `【${bookName} ${chapter}:${v.VerseSN}】\n${parsed.chinese}\n${parsed.english}`;
        }
        return `【${bookName} ${chapter}:${v.VerseSN}】${parsed.chinese}`;
      })
      .join('\n\n');
    
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [verses, startVerse, endVerse, bookName, chapter]);

  const displayVerses = useMemo(() => 
    verses.filter(v => v.VerseSN >= startVerse && v.VerseSN <= endVerse),
    [verses, startVerse, endVerse]
  );

  const renderVerseItem = useCallback(({ item: verse }: { item: BibleVerse }) => (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
      <Text style={{ 
        color: isDark ? '#60a5fa' : '#2563eb',
        fontWeight: '600',
        flexShrink: 0,
        fontSize: 18,
        width: 30
      }}>
        {verse.VerseSN}
      </Text>
      <View style={{ flex: 1 }}>
        {(() => {
          const parsed = parseVerseLection(verse.Lection);
          return (
            <>
              <Text style={{ 
                color: isDark ? '#d1d5db' : '#374151',
                lineHeight: 28,
                fontSize: 18,
                marginBottom: parsed.hasBilingual ? 6 : 0,
              }}>
                {parsed.chinese}
              </Text>
              {parsed.hasBilingual && (
                <Text style={{ 
                  color: isDark ? '#9ca3af' : '#6b7280',
                  lineHeight: 26,
                  fontSize: 16,
                  fontStyle: 'italic',
                }}>
                  {parsed.english}
                </Text>
              )}
            </>
          );
        })()}
      </View>
    </View>
  ), [isDark]);

  if (!isOpen) return null;

  const currentVersionLabel = availableVersions.find(v => v.key === version)?.label || '和合本';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      hardwareAccelerated
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* 点击上方空白区域关闭 */}
        <TouchableOpacity 
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View 
          style={{
            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            height: '50%',
            borderTopWidth: 2,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: isDark ? '#374151' : '#d1d5db',
          }}
        >
          {/* Header */}
          <View className={`flex-row items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {bookName} {chapter}:{startVerse}{endVerse !== startVerse ? `-${endVerse}` : ''}
            </Text>
            <View className="flex-row items-center gap-2">
              {/* Version Picker */}
              <TouchableOpacity
                onPress={() => setShowVersionPicker(!showVersionPicker)}
                className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
              >
                <Text className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {currentVersionLabel}
                </Text>
                <IconSymbol name="chevron.down" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={onClose}
                className="p-2 rounded-lg"
              >
                <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Version Picker Dropdown */}
          {showVersionPicker && (
            <View className={`px-4 py-2 border-b ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
              {availableVersions.map((v) => (
                <TouchableOpacity
                  key={v.key}
                  onPress={() => {
                    onVersionChange?.(v.key);
                    setShowVersionPicker(false);
                  }}
                  className={`py-2 px-3 rounded-lg mb-1 ${version === v.key ? (isDark ? 'bg-blue-600' : 'bg-blue-500') : ''}`}
                >
                  <Text className={`text-sm ${version === v.key ? 'text-white font-semibold' : (isDark ? 'text-gray-200' : 'text-gray-700')}`}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {!ncvUnlocked && (
                <TouchableOpacity
                  onPress={() => {
                    setShowVersionPicker(false);
                    setShowPasswordModal(true);
                  }}
                  className={`py-2 px-3 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}
                >
                  <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    🔒 解锁新译本
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : error ? (
            <View className="flex-1 px-4 py-3">
              <Text className={isDark ? 'text-red-400' : 'text-red-600'}>{error}</Text>
            </View>
          ) : displayVerses.length === 0 ? (
            <View className="flex-1 px-4 py-3">
              <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>未找到经文</Text>
            </View>
          ) : (
            <FlatList
              data={displayVerses}
              keyExtractor={(item) => `${item.ID}`}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
              renderItem={renderVerseItem}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              windowSize={3}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 68,
                offset: 68 * index,
                index,
              })}
            />
          )}

          {/* Footer */}
          {displayVerses.length > 0 && (
            <View className={`px-4 py-1.5 border-t ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'} flex-row justify-end`}>
              <TouchableOpacity 
                onPress={handleCopy}
                className="flex-row items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {copied ? (
                  <>
                    <IconSymbol name="checkmark" size={18} color="white" />
                    <Text className="text-white font-medium">已复制</Text>
                  </>
                ) : (
                  <>
                    <IconSymbol name="doc.on.doc" size={18} color="white" />
                    <Text className="text-white font-medium">复制经文</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Password Modal for NCV Unlock */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <Pressable 
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowPasswordModal(false)}
        >
          <Pressable 
            className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-80`}
            onPress={(e) => e.stopPropagation()}
          >
            <Text className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              解锁新译本
            </Text>
            <Text className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              请输入口令以启用新译本（内测版）
            </Text>
            <TextInput
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="输入口令"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              secureTextEntry
              autoFocus
              onSubmitEditing={handlePasswordSubmit}
              className={`px-4 py-3 rounded-lg mb-4 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
                className={`flex-1 py-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                <Text className={`text-center font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  取消
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePasswordSubmit}
                className="flex-1 py-3 rounded-lg bg-blue-600"
              >
                <Text className="text-center font-medium text-white">
                  确认
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
});

BibleVerseModal.displayName = 'BibleVerseModal';

export default BibleVerseModal;
