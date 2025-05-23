import React from 'react';
import { Image, Pressable } from 'react-native'
import { View, Text } from './Themed'

interface RecipeBookmarkCardProps {
  image: string;
  title: string;
  cookingTime: string;
  difficulty: string;
  onPress: () => void;
  theme: 'light' | 'dark';
}

export default function RecipeBookmarkCard({ image, title, cookingTime, difficulty, onPress, theme }: RecipeBookmarkCardProps) {
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
      <View className="flex flex-row p-4 !bg-transparent">
        <Image source={{ uri: image }} className="w-16 h-16 rounded" />
        <View className="flex-1 ml-4 !bg-transparent">
          <Text className="text-lg" numberOfLines={2} ellipsizeMode="tail">{title}</Text>
          <Text className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {cookingTime} - {difficulty}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};
