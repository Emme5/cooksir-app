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
import { FontAwesome } from '@expo/vector-icons'
import { useAuth } from '@/providers/AuthProvider'
import CustomAlert from '@/components/CustomAlert'

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
  const { session } = useAuth()
  const [userRating, setUserRating] = useState(0)
  const [averageRating, setAverageRating] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)
  const [hasRated, setHasRated] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  const StarRating = ({ rating, maxRating = 5, size = 24, onRatingChange }) => {
    return (
      <View className="flex-row">
        {[...Array(maxRating)].map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onRatingChange && onRatingChange(index + 1)}
            className="p-1"
          >
            <FontAwesome
              name={index < rating ? "star" : "star-o"}
              size={size}
              color={index < rating ? "#FFD700" : "#CCCCCC"}
            />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

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

  useEffect(() => {
    if (RecipeDetail) {
      fetchRatings();
    }
  }, [RecipeDetail, session]);

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

  const fetchRatings = async () => {
    try {
      // ดึงคะแนนเฉลี่ย - แก้ไขตรงนี้
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('rating')
        .eq('recipe_id', params.id);
        
      if (ratingsError) throw ratingsError;
      
      // คำนวณคะแนนเฉลี่ยเอง
      let avg = 0;
      if (ratingsData && ratingsData.length > 0) {
        const sum = ratingsData.reduce((total, item) => total + item.rating, 0);
        avg = sum / ratingsData.length;
      }
      
      // ดึงจำนวนคะแนนทั้งหมด
      const { count, error: countError } = await supabase
        .from('ratings')
        .select('id', { count: 'exact' })
        .eq('recipe_id', params.id);
      
      if (countError) throw countError;
      
      // ถ้ามีผู้ใช้ปัจจุบัน ให้ดึงคะแนนที่ผู้ใช้เคยให้ไว้
      if (session?.user) {
        const { data: userRatingData, error: userRatingError } = await supabase
          .from('ratings')
          .select('rating')
          .eq('recipe_id', params.id)
          .eq('user_id', session.user.id)
          .single();
        
        if (!userRatingError && userRatingData) {
          setUserRating(userRatingData.rating);
          setHasRated(true);
        }
      }
      
      setAverageRating(avg);
      setRatingCount(count || 0);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };
  
  const handleRating = async (rating) => {
    try {
      if (!session?.user) {
        // แสดง alert ให้ล็อกอินก่อน
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('rating.loginRequired'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            }
          ]
        });
        return;
      }
      
      // ระบุ primary key เพิ่มเติมเพื่อให้ upsert ทำงานได้ถูกต้อง
      const { error } = await supabase
        .from('ratings')
        .upsert({
          recipe_id: params.id,
          user_id: session.user.id,
          rating
        }, { 
          onConflict: 'user_id,recipe_id' // ระบุเงื่อนไขความขัดแย้ง
        });
        
      if (error) throw error;
      
      setUserRating(rating);
      setHasRated(true);
      
      // รีเฟรชข้อมูลคะแนนเฉลี่ย
      fetchRatings();
      
      // แสดง alert บันทึกคะแนนสำเร็จ
      setAlertConfig({
        visible: true,
        title: t('rating.success.title'),
        message: t('rating.success.message'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    } catch (error) {
      console.error('Error saving rating:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('rating.error'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    }
  };

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

          {/* Rating Section */}
          <View className={`p-4 rounded-lg shadow-md mt-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <View className="items-center">
              <Text weight="medium" className="text-lg mb-2 text-center">{t('recipe.rating')}</Text>
              
              {/* Average Rating */}
              <View className="flex-row items-center mb-4">
                <Text className="mr-2">{t('recipe.averageRating')}:</Text>
                <StarRating rating={Math.round(averageRating)} onRatingChange={null} />
                <Text className="ml-2">({averageRating.toFixed(1)}) - {ratingCount} {t('recipe.votes')}</Text>
              </View>
              
              {/* User Rating */}
              <Text className="mb-2">{hasRated ? t('recipe.yourRating') : t('recipe.rateThis')}</Text>
              <StarRating rating={userRating} onRatingChange={handleRating} />
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

      <CustomAlert
  visible={alertConfig.visible}
  title={alertConfig.title}
  message={alertConfig.message}
  buttons={alertConfig.buttons}
  onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
/>

    </SafeAreaView>
  )
}
