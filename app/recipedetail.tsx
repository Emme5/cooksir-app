import React, { useEffect, useState } from 'react'
import { ScrollView, Image, TouchableOpacity, Dimensions, Linking, SafeAreaView } from 'react-native'
import { View } from '@/components/Themed'
import ImageView from 'react-native-image-viewing'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '@/utils/supabase'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import { th } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { Text } from "@/components/CustomText"
import { useTheme } from '@/providers/ThemeProvider'

interface SellerProfile {
  id: string
  avatar_url: string | null
  display_name: string
  phone: string
  updated_at: string
}

interface RecipeDetail {
  id: number
  title: string
  cooking_time: number
  description: string
  category_id: number
  difficulty: number
  user_id: string
  origin: string
}

interface RecipeImage {
  id: number
  recipe_id: number
  image_url: string
}

interface Category {
  id: number
  name_th: string
  name_en: string
  status: boolean
}

interface Difficulty {
  id: number
  name_th: string
  name_en: string
  status: boolean
}

export default function RecipeDetail() {
  const { t, i18n } = useTranslation()
  const params = useLocalSearchParams()
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  const [RecipeDetail, setRecipeDetail] = useState<RecipeDetail | null>(null)
  const [RecipeImages, setRecipeImages] = useState<RecipeImage[]>([])
  const [isImageViewVisible, setIsImageViewVisible] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const screenWidth = Dimensions.get('window').width
  const [category, setCategory] = useState<Category | null>(null)
  const [Difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const { theme } = useTheme()

  const fetchRecipeDetail = async () => {
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*') // ดึงข้อมูลทั้งหมด
        .eq('id', params.id)
        .single()
  
      if (recipeError) throw recipeError
      setRecipeDetail(recipeData)
  
      if (recipeData?.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', recipeData.user_id)
          .single()
  
        if (profileError) throw profileError
        setSellerProfile(profileData)
      }
    } catch (error) {
      console.error('Error fetching recipe detail:', error)
    }
  }

  const fetchRecipeImages = async () => {
    try {
      const { data: imageData, error: imageError } = await supabase
        .from('recipe_images')
        .select('*')
        .eq('recipe_id', params.id)
        .order('id')

      if (imageError) throw imageError
      setRecipeImages(imageData || [])
    } catch (error) {
      console.error('Error fetching recipe images:', error)
    }
  }

  const fetchCategoryAndDifficulty = async () => {
    try {
      if (RecipeDetail?.category_id) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', RecipeDetail.category_id)
          .single()
  
        if (categoryError) throw categoryError
        setCategory(categoryData)
      }
  
      if (RecipeDetail?.difficulty) { 
        const { data: DifficultyData, error: DifficultyError } = await supabase
          .from('conditions') 
          .select('*')
          .eq('id', RecipeDetail.difficulty) 
          .single()
  
        if (DifficultyError) throw DifficultyError
        setDifficulty(DifficultyData)
      }
    } catch (error) {
      console.error('Error fetching category/Difficulty:', error)
    }
  }

  useEffect(() => {
    fetchRecipeDetail()
    fetchRecipeImages()
  }, [params.id])
  
  useEffect(() => {
    if (RecipeDetail) {
      fetchCategoryAndDifficulty()
    }
  }, [RecipeDetail])

  const handleContact = () => {
    if (sellerProfile?.phone) {
      Linking.openURL(`tel:${sellerProfile.phone}`)
    }
  }

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x
    const imageIndex = Math.round(contentOffset / screenWidth)
    setCurrentImageIndex(imageIndex)
  }

  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index)
    setIsImageViewVisible(true)
  }

  const imageViewImages = RecipeImages.map(img => ({
    uri: img.image_url
  }))

  const getLocalizedName = (item: Category | Difficulty | null) => {
    if (!item) return ''
    return i18n.language === 'th' ? item.name_th : item.name_en
  }

  const formatDate = (dateString: string) => {
    try {
      const utcDate = parseISO(dateString)
      const bangkokDate = toZonedTime(utcDate, 'Asia/Bangkok')
      const relativeTime = formatDistanceToNow(bangkokDate, { 
        addSuffix: true,
        locale: th 
      })
      return relativeTime
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }

  const formatThaiDateTime = (dateString: string) => {
    try {
      const utcDate = parseISO(dateString)
      const bangkokDate = toZonedTime(utcDate, 'Asia/Bangkok')
      return format(bangkokDate, 'dd/MM/yyyy HH:mm น.', { locale: th })
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }

  return (
    <SafeAreaView 
      className="h-full"
      style={{
        backgroundColor: theme === 'dark' ? '#000' : '#fff'
      }}
    >
      <Stack.Screen
        options={{
          headerTitle: params.title as string,
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: 18,
            fontFamily: i18n.language === 'th' ? "NotoSansThai-Regular" : "Poppins-Regular",
            color: theme === 'dark' ? '#fff' : '#000',
          },
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: theme === 'dark' ? '#fff' : '#000',
          headerBackVisible: true,
        }}
      />

      <ScrollView 
        className="h-full"
        contentContainerStyle={{ 
          backgroundColor: theme === 'dark' ? '#000' : '#fff'
        }}
      >
        {/* Image Viewer Modal */}
        <ImageView
          images={imageViewImages}
          imageIndex={currentImageIndex}
          visible={isImageViewVisible}
          onRequestClose={() => setIsImageViewVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />

        {/* recipe Images Slider */}
        <View className="relative">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {RecipeImages.length > 0 ? (
              RecipeImages.map((image, index) => (
                <TouchableOpacity
                  key={image.id}
                  onPress={() => handleImagePress(index)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: image.image_url }}
                    style={{ width: screenWidth, height: 384 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Image
                source={{ 
                  uri: 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'
                }}
                style={{ width: screenWidth, height: 384 }}
                resizeMode="cover"
              />
            )}
          </ScrollView>
          
          {/* Image Counter */}
          <View className="absolute bottom-4 right-4 bg-black/50 px-2 py-1 rounded">
            <Text className="text-white">
              {RecipeImages.length > 0 
                ? `${currentImageIndex + 1}/${RecipeImages.length}`
                : '0/0'
              }
            </Text>
          </View>
        </View>

        {/* recipe Info */}
        <View className="p-4 space-y-6">
        <View className={`p-4 rounded-lg shadow-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <View className="items-center">
              <Text weight="regular" className="text-2xl leading-9">{params.title as string}</Text>
              <View className="mt-1 items-center">
                <Text className="text-xl text-secondary-200">
                  เวลาทำโดยประมาณ : {Number(params.cooking_time).toLocaleString()} นาที
                </Text>
              </View>
          </View>
        </View>

          {/* Description */}
          <View className={`p-4 rounded-lg shadow-md mt-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <View className="items-center">
              <Text weight="medium" className="text-lg mb-3 text-center">{t('recipe.description')}</Text>
              <Text className="text-gray-600 text-center mb-4">
                {params.description as string}
              </Text>
            </View>
          </View>

          <View className={`p-4 rounded-lg shadow-md mt-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <View className="items-center">
              <Text className="text-lg mb-3 text-center" weight='medium'>{t('recipe.Difficulty')}</Text>
              {Difficulty ? (
                <Text className="text-gray-600 text-center mb-4">
                  {getLocalizedName(Difficulty)}
                </Text>
              ) : (
                <Text className="text-gray-600 text-center mb-4">
                  {t('recipe.noDifficulty')}
                </Text>
              )}

              <Text className="text-lg mb-3 text-center" weight='medium'>{t('recipe.category')}</Text>
              {category && (
                <Text className="text-gray-600 text-center mb-4">
                  {getLocalizedName(category)}
                </Text>
              )}

              <Text className="text-lg mb-3 text-center" weight='medium'>{t('recipe.origin')}</Text>
              <Text className="text-gray-600 text-center mb-4">
                  {RecipeDetail?.origin || t('recipe.noorigin')}
              </Text>

              <Text className="text-lg mb-3 text-center" weight='medium'>วันที่ลงประกาศ</Text>
              <Text className="text-gray-600 text-center">
                {params.created_at ? formatDate(params.created_at as string) : ''} - {params.created_at ? formatThaiDateTime(params.created_at as string) : ''}
              </Text>
            </View>
          </View>

          {/* Seller Info */}
          <View className="mt-6 mb-8">
            <Text weight="medium" className="text-lg font-medium mb-2">ข้อมูลผู้แชร์สูตร</Text>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Image 
                  source={{ 
                    uri: sellerProfile?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'
                  }}
                  className="w-10 h-10 rounded-full"
                />
                <View className="ml-4">
                  <Text 
                    weight="semibold"
                    style={{
                      fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold'
                    }}
                  >
                    {sellerProfile?.display_name || 'ไม่ระบุชื่อ'}
                  </Text>
                  <Text 
                    weight="regular"
                    className="text-gray-500"
                    style={{
                      fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular'
                    }}
                  >
                    {sellerProfile?.phone || 'ไม่ระบุเบอร์โทรศัพท์'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                className="bg-secondary-200 p-2 rounded-lg"
                onPress={handleContact}
              >
                <Text className="!text-white">ติดต่อ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
