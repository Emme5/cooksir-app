import { Image, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import React from 'react';
import { useTheme } from '@/providers/ThemeProvider'

export default function RecipeCard({
  title, 
  cooking_time,
  image,
  status,
  postDate,
  description,
  onPress,
  theme: propTheme, // รับ theme จาก props เพื่อให้สามารถส่งมาจากภายนอกได้
}: any) {
  const { theme: contextTheme } = useTheme()
  const theme = propTheme || contextTheme // ใช้ propTheme ถ้ามี หรือไม่ก็ใช้จาก context

  return (
    <Pressable 
    onPress={onPress} 
    className={`flex flex-col border-b ${
      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
    }`}
    android_ripple={{ 
      color: 'rgba(104, 104, 104, 0.3)',
      foreground: true,
      borderless: false
    }}
    style={({ pressed }) => [
      {
        opacity: pressed ? 0.9 : 1,
      },
    ]}
  >
    <View className="p-4 !bg-transparent">
      <Image
        source={{uri: image}} // ใช้ image แทน recipeImage
        className="w-full h-64 rounded-xl"
        resizeMode="cover"
      />
      <Text
        className="text-xl pt-4"
        fontWeight='medium'
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {title} {/* ใช้ title แทน recipeName */}
      </Text>
      <View className="flex flex-row justify-between mt-2 !bg-transparent">
        <Text
          className="text-lg !text-gray-400"
          fontWeight='medium'
        >
          {cooking_time} {/* ใช้ cooking_time แทน cookingTime */}
        </Text>
        <Text
          className="text-md !text-gray-400 mt-1"
          fontWeight='medium'
        >
          {status || postDate} {/* แสดง status ถ้ามี หรือไม่ก็แสดง postDate */}
        </Text>
      </View>
      <Text
        className="text-md mt-2"
        fontWeight='regular'
        numberOfLines={3}
        ellipsizeMode="tail"
      >
        {description}
      </Text>
    </View>
  </Pressable>
);
}