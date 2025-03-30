import { Image, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import React from 'react';
import { useTheme } from '@/providers/ThemeProvider'
import { FontAwesome } from '@expo/vector-icons';

export default function RecipeCard({
  title, 
  cooking_time,
  image,
  status,
  postDate,
  description,
  onPress,
  theme: propTheme, 
  averageRating = 0,
}: any) {
  const { theme: contextTheme } = useTheme()
  const theme = propTheme || contextTheme

  const renderStars = (rating) => {
    return (
      <View className="flex-row mt-1 !bg-transparent">
        {[1, 2, 3, 4, 5].map((star) => (
          <FontAwesome
            key={star}
            name={star <= Math.round(rating) ? "star" : "star-o"}
            size={16}
            color="#FFD700"
            style={{ marginRight: 2 }}
          />
        ))}
        <Text className="ml-1 text-gray-500">({rating.toFixed(1)})</Text>
      </View>
    );
  };

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
          source={{uri: image}}
          className="w-full h-64 rounded-xl"
          resizeMode="cover"
        />
        <Text
          className="text-xl pt-4"
          fontWeight='medium'
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        
        {/* เพิ่มส่วนแสดงคะแนนดาว */}
        {averageRating > 0 && renderStars(averageRating)}
        
        <View className="flex flex-row justify-between mt-2 !bg-transparent">
          <Text
            className="text-lg !text-gray-400"
            fontWeight='medium'
          >
            {cooking_time}
          </Text>
          <Text
            className="text-md !text-gray-400 mt-1"
            fontWeight='medium'
          >
            {status || postDate}
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