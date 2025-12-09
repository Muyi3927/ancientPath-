import React from 'react';
import { View, Text, ScrollView, useColorScheme, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { aboutContent } from '../constants/AboutData';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AboutScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  return (
    <>
      <Stack.Screen 
        options={{
          title: '关于访问古道',
          headerBackTitle: '返回',
          headerTintColor: '#2563eb',
          headerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
          headerTitleStyle: { color: isDark ? '#fff' : '#000' },
        }} 
      />
      <ScrollView className="flex-1 bg-slate-100 dark:bg-black px-4 py-6">
        
        {/* Header Section */}
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-4 text-center font-serif">关于访问古道</Text>
          
          <View className="bg-blue-50/50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 mb-6 w-full shadow-sm">
            <Text className="text-lg italic text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
              "耶和华如此说：你们当站在路上察看，访问古道，哪是善道，便行在其中，这样你们心里必得安息。"
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-3 text-right font-medium">— 耶利米书 6:16</Text>
          </View>

          <Text className="text-base text-slate-600 dark:text-slate-400 leading-relaxed text-center px-2">
            {aboutContent.intro}
          </Text>
        </View>

        {/* Creeds Section */}
        <SectionHeader title="我们认信" subtitle="We Confess" icon="shield.fill" />
        
        <View className="mb-8">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">普世信经</Text>
            <Text className="text-gray-600 dark:text-gray-400 mb-4">{aboutContent.creeds.intro}</Text>
            
            {aboutContent.creeds.universal.map((creed, index) => (
                <ExpandableCard key={index} title={creed.title} subtitle={creed.subtitle} content={creed.content} isDark={isDark} />
            ))}
        </View>

        <View className="mb-8">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">改革宗信条</Text>
            {aboutContent.creeds.reformed.map((creed, index) => (
                <ExpandableCard key={index} title={creed.title} subtitle={creed.subtitle} content={creed.content} isDark={isDark} />
            ))}
        </View>

        {/* Church Order */}
        <SectionHeader title={aboutContent.churchOrder.title} subtitle="Church Order" icon="doc.text.fill" />
        <View className="mb-8">
             <Text className="text-gray-600 dark:text-gray-400 mb-4">{aboutContent.churchOrder.intro}</Text>
             <ExpandableCard title="教会规章详情" content={aboutContent.churchOrder.content} isDark={isDark} />
        </View>

        {/* Offices */}
        <SectionHeader title="教会职分" subtitle="Offices" icon="person.3.fill" />
        <View className="mb-8">
            {aboutContent.offices.map((office, index) => (
                <ExpandableCard key={index} title={office.title} subtitle={office.role} content={office.content} isDark={isDark} />
            ))}
        </View>

        {/* Sacraments */}
        <SectionHeader title="圣礼" subtitle="Sacraments" icon="drop.fill" />
        <View className="mb-12">
            {aboutContent.sacraments.map((sacrament, index) => (
                <ExpandableCard key={index} title={sacrament.title} subtitle={sacrament.subtitle} content={sacrament.content} isDark={isDark} />
            ))}
        </View>

        <View className="h-10" />
      </ScrollView>
    </>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string, subtitle?: string, icon: string }) {
    return (
        <View className="flex-row items-center mb-6 mt-2">
            <View className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                <IconSymbol name={icon as any} size={24} color="#2563eb" />
            </View>
            <View>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">{title}</Text>
                {subtitle && <Text className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</Text>}
            </View>
        </View>
    );
}

function ExpandableCard({ title, subtitle, content, isDark }: { title: string, subtitle?: string, content: string, isDark: boolean }) {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <View className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-4 overflow-hidden">
            <TouchableOpacity 
                className="p-5 flex-row justify-between items-center active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors" 
                onPress={() => setExpanded(!expanded)}
            >
                <View className="flex-1 pr-4">
                    <Text className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">{title}</Text>
                    {subtitle && <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium">{subtitle}</Text>}
                </View>
                <View className={`p-2 rounded-full ${expanded ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    <IconSymbol name={expanded ? "chevron.up" : "chevron.down"} size={16} color={expanded ? "#2563eb" : (isDark ? "#9ca3af" : "#64748b")} />
                </View>
            </TouchableOpacity>
            
            {expanded && (
                <View className="px-5 pb-5 pt-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                    <Markdown 
                        style={{
                            body: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 15, lineHeight: 26 },
                            heading1: { color: isDark ? '#fff' : '#0f172a', marginTop: 16, marginBottom: 12, fontSize: 18, fontWeight: 'bold' },
                            heading2: { color: isDark ? '#f1f5f9' : '#1e293b', marginTop: 16, marginBottom: 10, fontSize: 16, fontWeight: 'bold' },
                            blockquote: { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderLeftColor: '#3b82f6', borderLeftWidth: 4, padding: 12, fontStyle: 'italic', color: isDark ? '#94a3b8' : '#475569', borderRadius: 8, marginVertical: 8 },
                            bullet_list: { marginBottom: 12 },
                            ordered_list: { marginBottom: 12 },
                            paragraph: { marginBottom: 12 },
                        }}
                    >
                        {content}
                    </Markdown>
                </View>
            )}
        </View>
    );
}
