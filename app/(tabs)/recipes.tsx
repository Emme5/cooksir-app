import React, { useEffect, useState, useRef } from 'react'
import { FlatList, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native'
import { View } from '@/components/Themed'
import RecipeCard from '@/components/RecipeCard'
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/providers/AuthProvider"
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/providers/ThemeProvider'
import { useRouter } from 'expo-router'
import i18n from '@/i18n'
import { Swipeable } from 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import CustomAlert from '@/components/CustomAlert'
import { Text } from "@/components/CustomText"

// เพิ่ม interface สำหรับข้อมูลสูตรอาหาร
interface Recipe {
  id: number
  title: string
  cooking_time: number
  description: string
  category_id: number
  difficulty: number
  user_id: string
  created_at: string
  location: string
  recipe_images?: {
    image_url: string
  }[]
}

// เพิ่ม interface สำหรับ Condition
interface Condition {
  id: number
  name_th: string
  name_en: string
  status: boolean
}

export default function Bookmark() {
  const { session } = useAuth()
  const [Recipes, setRecipes] = useState<Recipe[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { t } = useTranslation()
  const { theme } = useTheme()
  const router = useRouter()
  const [conditions, setConditions] = useState<Condition[]>([])
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({})
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

  // ฟังก์ชันดึงข้อมูลสูตรอาหาร
  const fetchUserRecipes = async () => {
    try {
      if (!session?.user) return

      const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_images(*)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error fetching user recipes:", error)
    }
  }

  // ดังก์ชันดึงข้อมูล conditions
  const fetchConditions = async () => {
    try {
    const { data, error } = await supabase
        .from('conditions')
        .select('*')

    if (error) throw error
    setConditions(data || [])
    } catch (error) {
    console.error("Error fetching conditions:", error)
    }
}

  // ดึงข้อมูลเมื่อ component โหลดหรือ session เปลี่ยน
  useEffect(() => {
    fetchUserRecipes()
    fetchConditions()
  }, [session])

  // เพิ่มฟังก์ช onRefresh
  const onRefresh = async () => {
    setRefreshing(true)
    await fetchUserRecipes()
    setRefreshing(false)
  }

  // เพิ่มฟังก์ชันสำหรับการนำทางไปยังหน้า RecipeDetail
  const handleRecipePress = (Recipe: Recipe) => {
    // ปิด swipeable ที่เปิดอยู่
    closeSwipeable(Recipe.id);
  
    // นำทางไปยังหน้า RecipeDetail
    router.push({
      pathname: '/recipedetail',
      params: {
        id: Recipe.id,
        title: Recipe.title,
        cooking_time: Recipe.cooking_time,
        description: Recipe.description,
        difficulty: Recipe.difficulty, // ตรวจสอบให้แน่ใจว่ามีการส่ง difficulty ไปด้วย
        category_id: Recipe.category_id,
        user_id: Recipe.user_id,
        created_at: Recipe.created_at,
        location: Recipe.location,
      }
    });
  }

  // ฟังก์ชันสำหรับแสดงชื่อ condition ตามภาษา
  const getLocalizedConditionName = (conditionId: number) => {
    const condition = conditions.find(cond => cond.id === conditionId)
    return condition ? (i18n.language === 'th' ? condition.name_th : condition.name_en) : t('recipe.noDifficulty')
}

  // ฟังก์ชันสำหรับลบสูตรอาหาร
  const handleDeleteRecipe = async (RecipeId: number) => {
    setAlertConfig({
      visible: true,
      title: t('bookmark.deleteAlert.title'),
      message: t('bookmark.deleteAlert.message'),
      buttons: [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            try {
              const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('id', RecipeId)

              if (error) throw error

              // ลบรายการออกจาก state
              setRecipes(Recipes.filter(Recipe => Recipe.id !== RecipeId))
            } catch (error) {
              console.error("Error deleting recipe:", error)
              setAlertConfig({
                visible: true,
                title: t('common.error'),
                message: t('bookmark.deleteAlert.error'),
                buttons: [
                  {
                    text: t('common.ok'),
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                  }
                ]
              });
            }
          }
        }
      ]
    });
  }

  // ฟังก์ชันสำหรับแก้ไขสูตรอาหาร
  const handleEditRecipe = (Recipe: Recipe) => {
    // นำทางไปยังหน้าแก้ไขสูตรอาหาร
    router.push({
      pathname: '/editrecipe',
      params: { id: Recipe.id }
    })
  }

  const renderRightActions = (Recipe: Recipe) => (
    <View className="flex-row">
      <TouchableOpacity
        className="bg-blue-500 justify-center items-center w-20"
        onPress={() => handleEditRecipe(Recipe)}
      >
        <Text className="!text-white">{t('bookmark.actions.edit')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="bg-red-500 justify-center items-center w-20"
        onPress={() => handleDeleteRecipe(Recipe.id)}
      >
        <Text className="!text-white">{t('bookmark.actions.delete')}</Text>
      </TouchableOpacity>
    </View>
  )

  // ฟังก์ชันสำหรับปิด swipeable ที่เปิดอยู่
  const closeSwipeable = (RecipeId: number) => {
    Object.entries(swipeableRefs.current).forEach(([key, ref]) => {
      if (Number(key) !== RecipeId && ref) {
        ref.close();
      }
    });
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="h-full">
        <View className="h-full">
          <FlatList
            refreshControl={
              <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
            />
          }
          ListHeaderComponent={() => (
            <View className={`w-full flex-1 py-4 px-4 ${
              theme === 'dark' ? 'bg-primary' : 'bg-white'
            }`}>
              <Text weight="medium" className="text-2xl">
                {t('bookmark.title')}
              </Text>
            </View>
          )}
          data={Recipes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Swipeable
              ref={ref => swipeableRefs.current[item.id] = ref}
              renderRightActions={() => renderRightActions(item)}
              onSwipeableOpen={() => closeSwipeable(item.id)}
            >
              <RecipeCard
                image={item.recipe_images?.[0]?.image_url || 'https://png.pngtree.com/png-vector/20230215/ourmid/pngtree-cooking-logo-png-image_6601988.png'}
                // อาจจะต้องเปลี่ยน URL เป็นรูปที่สามารถเข้าถึงได้จริง
                title={item.title}
                cooking_time={`เวลาทำโดยประมาณ : ${item.cooking_time} นาที`} // แก้ไขรูปแบบการแสดงเวลา
                status={getLocalizedConditionName(item.difficulty)}
                onPress={() => handleRecipePress(item)}
                theme={theme}
              />
            </Swipeable>
          )}
          ListEmptyComponent={() => (
            <View className={`p-4 ${
              theme === 'dark' ? 'bg-primary' : 'bg-white'
            }`}>
              <Text weight="regular" className="text-center">
                {t('bookmark.empty')}
              </Text>
            </View>
          )}
          contentContainerStyle={{
            backgroundColor: theme === 'dark' ? '#161622' : '#fff'
          }}
          />
        </View>

        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}