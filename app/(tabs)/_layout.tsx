// rnf
import React from "react"
// import Octicons from "@expo/vector-icons/Octicons"
import { Tabs } from "expo-router"
import { icons } from "@/constants"
import { View, Image, Platform } from "react-native"
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/providers/ThemeProvider'

// function TabBarIcon(props: {
//   name: React.ComponentProps<typeof Octicons>["name"]
//   color: string
// }) {
//   return <Octicons size={24} style={{ marginBottom: 5 }} {...props} />
// }

// สรับปรุง interface ของ TabIcon
interface TabIconProps {
  icon: any
  color: string
  focused: boolean
  size?: 'normal' | 'large'  // เพิ่ม prop สำหรับกำหนดขนาด
  homeSize?: string
  bookmarkSize?: string
  profileSize?: string
}

// ปรับปรุง TabIcon component
const TabIcon = ({ icon, color, focused, size = 'normal'
  , homeSize = 'w-6 h-8'
  , bookmarkSize = 'w-6 h-8'
  , profileSize = 'w-6 h-8'
}: TabIconProps) => {
  let iconSize = 'w-6 h-8'; // ขนาดเริ่มต้น
  if (size === 'large') {
    iconSize = 'w-9 h-9';
  } else if (icon === icons.home) {
    iconSize = homeSize;
  } else if (icon === icons.bookmark) {
    iconSize = bookmarkSize;
  } else if (icon === icons.profile) {
    iconSize = profileSize;
  }

  return (
    <View className={`
      flex items-center justify-center
      ${size === 'large' ? '-mt-7' : ''}  // ขยับไอคอนขึ้นถ้าเป็นขนาดใหญ่
    `}>
      <View className={`
        flex items-center justify-center
        ${size === 'large' ? 'bg-cyan-400 p-3 rounded-full' : ''}  // เพิ่มพื้นหลังถ้าเป็นขนาดใหญ่
      `}>
        <Image
          source={icon}
          resizeMode="contain"
          tintColor={size === 'large' ? '#FFFFFF' : color}
          className={iconSize} // ใช้ตัวแปร iconSize
        />
      </View>
    </View>
  )
}

export default function TabLayout() {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()

  // Define colors based on theme
  const tabBarBackgroundColor = theme === 'dark' ? '#161622' : '#ffffff'
  const tabBarBorderColor = theme === 'dark' ? '#535eb0' : '#e0e0e0'
  const tabBarActiveTintColor = theme === 'dark' ? '#873600' : '#873600'
  const tabBarInactiveTintColor = theme === 'dark' ? '#CDCDE0' : '#8e8e93'

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabBarActiveTintColor,
        tabBarInactiveTintColor: tabBarInactiveTintColor,
        tabBarShowLabel: true,
        tabBarLabelStyle: { 
          fontSize: 12,
          fontFamily: i18n.language === 'th' ? "NotoSansThai-Regular" : "Poppins-Regular",
          marginTop: 5,
        },
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopWidth: 0,
          borderTopColor: tabBarBorderColor,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingTop: 5,
          paddingBottom: Platform.OS === 'ios' ? 30 : 5,
          ...Platform.select({
            ios: {
              height: 90,
              paddingBottom: 35,
              safeAreaInsets: { bottom: 35 }
            }
          })
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.home}
              color={color}
              focused={focused}
              homeSize="w-12 h-12"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="recipes"
        options={{
          title: t('tabs.bookmark'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.bookmark}
              color={color}
              focused={focused}
              bookmarkSize="w-10 h-10"
            />
          ),
        }}
      />    

      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.plus}
              color={color}
              focused={focused}
              size="large"  // กำหนดให้เป็นขนาดใหญ่
            />
          ),
          // tabBarLabel: () => null,  // ซ่อน label สำหรับปุ่มตรงกลาง
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.profile}
              color={color}
              focused={focused}
              profileSize="w-8 h-8"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="setting"
        options={{
          title: t('tabs.settings'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.setting}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  )
}
