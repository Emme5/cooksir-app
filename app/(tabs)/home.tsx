// นำเข้า libraries และ components ที่จำเป็น
import React, { useEffect, useState } from "react"
import { FlatList, RefreshControl, Image, ActivityIndicator, TouchableOpacity, SafeAreaView } from "react-native"
import { View, Text } from "@/components/Themed"
import RecipeCard from "@/components/RecipeCard"
import HorizontalCard from "@/components/HorizontalCard"
import SearchInput from "@/components/SearchInput"
import { useAuth } from "@/providers/AuthProvider"
import { supabase } from "@/utils/supabase"
import { formatDistanceToNow, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { useTheme } from '@/providers/ThemeProvider'
import { useRouter } from 'expo-router'
import _ from 'lodash'
import { LogBox } from 'react-native'
import i18n from "@/i18n"
import { useTranslation } from 'react-i18next'

// กำหนดประเภทของข้อมูลสูตรอาหาร
type Recipe = {
  id: number
  title: string
  cooking_time: number
  description: string
  created_at: string
  hilight: boolean
  location: string
  difficulty: number // เพิ่ม field นี้
  recipe_images?: {
    image_url: string
  }[]
}

interface Condition {
  id: number
  name_th: string
  name_en: string
  status: boolean
}

// ฟังก์ชันสำหรับจัดรูปแบบวันที่
const formatDate = (dateString: string) => {
  try {
    const utcDate = parseISO(dateString) // แปลงวันที่เป็นวันที่ UTC
    const bangkokDate = toZonedTime(utcDate, 'Asia/Bangkok') // แปลงวันที่เป็นวันที่ของไทย
    const relativeTime = formatDistanceToNow(bangkokDate, { 
      addSuffix: true,
      locale: th 
    })
    return relativeTime
  } catch (error) {
    console.error('Error formatting date:', error) // กรณีมีข้อผิดพลาดในการแปลงวันที่
    return dateString // ส่งคืนวันที่เดิมถ้ามีข้อผิดพลาด
  }
}

export default function Home() {
  const { t } = useTranslation();
  const { session } = useAuth() // สถานะของผู้ใช้
  const [Recipes, setRecipes] = useState<Recipe[]>([]) // สูตรอาหารทั้งหมด
  const [hilightRecipes, setHilightRecipes] = useState<Recipe[]>([]) // สูตรอาหารแนะนำ
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]) // สูตรอาหารที่กรอง
  const [searchQuery, setSearchQuery] = useState("") // คำค้นหา
  const [refreshing, setRefreshing] = useState(false) // สถานะกำลังรีเฟรช
  const { theme } = useTheme() // สถานะของธีม
  const router = useRouter() // เครื่องมือสำหรับการเปลี่ยนหน้า
  const [conditions, setConditions] = useState<Condition[]>([]) // เก็บข้อมูล conditions

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables") // กรณีขาดตัวแปรสำหรับ Supabase
  } 

  // สถานะสำหรับจัดการ pagination
  const [page, setPage] = useState(0) // หน้าเริ่มต้น
  const [isLoadingMore, setIsLoadingMore] = useState(false) // สถานะกำลังโหลดเพิ่ม
  const [hasMore, setHasMore] = useState(true) // สถานะว่ายังมีข้อมูลให้โหลดอีกหรือไม่
  const ITEMS_PER_PAGE = 3 // จำนวนรายการที่จะโหลดต่อหน้า

  // เพิ่ม state สำหรับการค้นหา
  const [isSearching, setIsSearching] = useState(false)

  // เพิ่ม state สำหรับเก็บ URL รูปโปรไฟล์
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // ฟังก์ชันสำหรับแสดงชื่อ condition ตามภาษา
  const getLocalizedConditionName = (conditionId: number) => {
    const condition = conditions.find(cond => cond.id === conditionId)
    return condition ? (i18n.language === 'th' ? condition.name_th : condition.name_en) : t('recipe.noDifficulty')
  }

  // เพิ่มฟังก์ชันดึงข้อมูลโปรไฟล์
  const fetchProfile = async () => {
    try {
      if (!session?.user?.id) return

      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single()

      if (error) {
        // Check if the error is due to no rows found
        if (error.code === 'PGRST116') {
          console.warn('No profile found for user. Creating a default profile.');
          // You can choose to create a default profile here or just set avatarUrl to null
          setAvatarUrl(null);
          return;
        }
        // If it's a different error, throw it
        throw error;
      }
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

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

  // เรียกใช้ฟังก์ชันเมื่อ session เปลี่ยน
  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  // ฟังก์ชันค้นหาจาก Supabase
  const searchRecipes = async (searchText: string) => {
    try {
      setIsSearching(true)
      
      const { data, error, count } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_images (
            image_url
          ),
          ratings (rating)
        `, { count: 'exact' })
        .ilike('title', `%${searchText}%`)
        .range(0, ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false })
  
      if (error) throw error
  
      // คำนวณคะแนนเฉลี่ย
      const searchResultsWithRatings = data?.map(recipe => {
        const ratings = recipe.ratings || [];
        const averageRating = ratings.length 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;
        
        return {
          ...recipe,
          averageRating
        };
      }) || [];
  
      setFilteredRecipes(searchResultsWithRatings)
      setHasMore(count ? count > ITEMS_PER_PAGE : false)
      setPage(0)
      
    } catch (error) {
      console.error('🔍 ค้นหาผิดพลาด:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // ใช้ debounce เพื่อลดการเรียก API บ่อยเกินไป
  const debouncedSearch = _.debounce((text: string) => {
    searchRecipes(text)
  }, 500)

  // ฟังก์ชันจัดการการค้นหา
  const handleSearch = (text: string) => {
    setSearchQuery(text)
    
    if (text.trim() === "") {
      setFilteredRecipes(Recipes) // โหลดสูตรอาหารทั้งหมดกลับมา
      setHasMore(true) // รีเซ็ตสถานะว่ามีข้อมูลให้โหลดอีกหรือไม่
      setPage(0) // รีเซ็ตหน้าเริ่มต้น
      return
    }

    debouncedSearch(text)
  }

  // ฟัก์ชันดึงข้อมูลสูตรอาหารแนะนำ
  const fetchHilightRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_images (
            image_url
          ),
          ratings (rating)
        `)
        .eq('hilight', true)
        .order('created_at', { ascending: false })
  
      if (error) throw error
      
      // คำนวณคะแนนเฉลี่ย
      const highlightWithRatings = data?.map(recipe => {
        const ratings = recipe.ratings || [];
        const averageRating = ratings.length 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;
        
        return {
          ...recipe,
          averageRating
        };
      }) || [];
      
      setHilightRecipes(highlightWithRatings) // กำหนดค่าเริ่มต้นสำหรับสูตรอาหารแนะนำ
    } catch (error) {
      console.error("Error fetching hilight Recipes:", error)
    }
  }

  // ฟังก์ชันดึงข้อมูลสูตรอาหารพร้อมการจัดการ pagination
  const fetchRecipes = async (pageNumber = 0) => {
    try {
      const from = pageNumber * ITEMS_PER_PAGE
      console.log('🔍 กำลังดึงข้อมูลหน้า:', {
        page: pageNumber,
        from,
        to: from + ITEMS_PER_PAGE - 1
      })
      
      const { count } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
  
      console.log('📊 จำนวนสูตรอาหารทั้งหมด:', count)
  
      // ตรวจสอบว่า count เป็น 0 หรือไม่
      if (count === 0) {
        console.log('⚠️ ไม่มีข้อมูลในตาราง recipes')
        setHasMore(false)
        setRecipes([]) // ตั้งค่าให้เป็น array ว่าง
        return
      }
  
      if (count && from >= count) {
        console.log('⚠️ ไม่มีข้อมูลเพิ่มเติม')
        setHasMore(false)
        return
      }
  
      const to = from + ITEMS_PER_PAGE - 1
  
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_images (
            image_url
          ),
          ratings (rating)
        `)
        .range(from, to)
        .order('created_at', { ascending: false })
  
      if (error) throw error
  
      setHasMore(count ? from + ITEMS_PER_PAGE < count : false)
  
      // คำนวณคะแนนเฉลี่ย
      const recipesWithRatings = data?.map(recipe => {
        const ratings = recipe.ratings || [];
        let averageRating = 0;
        
        if (ratings.length > 0) {
          const sum = ratings.reduce((total, r) => total + r.rating, 0);
          averageRating = sum / ratings.length;
        }
        
        return {
          ...recipe,
          averageRating
        };
      }) || [];
  
      if (pageNumber === 0) {
        setRecipes(recipesWithRatings) // กำหนดค่าเริ่มต้นสำหรับสูตรอาหาร
      } else {
        setRecipes(prev => [...prev, ...recipesWithRatings])
      }
    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูล:", error)
      setHasMore(false)
    } finally {
      setIsLoadingMore(false) // ย้ายมาไว้ที่ finally
    }
  }

  // ฟังก์ชันโหลดข้อมูลเพิ่มเติมเมื่อเลื่อนถึงจุดสิ้นสุดของรายการ
  const loadMore = async () => {
    // ถ้ากำลังโหลดอยู่หรือไม่มีข้อมูลเพิ่มเติม ให้หยุดการทำงาน
    if (isLoadingMore || !hasMore) {
      console.log('🚫 ไม่สามารถโหลดเพิ่มได้:', { 
        isLoadingMore, 
        hasMore,
        currentPage: page 
      })
      return
    }

    console.log('📥 เริ่มโหลดข้อมูลเพิ่มเติม:', {
      currentPage: page,
      nextPage: page + 1
    })

    setIsLoadingMore(true)
    await fetchRecipes(page + 1)
    if(hasMore){
        setPage(prev => prev + 1)
    }

    console.log('✅ โหลดข้อมูลเพิ่มเติมเสร็จสิ้น:', {
      newPage: page + 1,
      totalItems: Recipes.length
    })
  }

  // ฟังก์ชันรีเฟรชข้อมูลสูตรอาหาร
  const onRefresh = async () => {
    setRefreshing(true) // เปลี่ยนสถานะเป็นกำลังรีเฟรช
    setPage(0) // รีเซ็ตหน้าเริ่มต้น
    setHasMore(true) // รีเซ็ตสถานะว่ามีข้อมูลให้โหลดอีกหรือไม่
    await Promise.all([
      fetchRecipes(0), // ดึงข้อมูลสูตรอาหารใหม่
      fetchHilightRecipes(), // ดึงข้อมูลสูตรอาหารแนะนำใหม่
      fetchConditions() // ดึงข้อมูลระดับความยาก
    ])
    setRefreshing(false)
  }

  useEffect(() => {
    setFilteredRecipes(Recipes) // กำหนดค่าเริ่มต้นสำหรับสูตรอาหารที่กรอง
  }, [Recipes])

  // ฟังก์ชันจัดการการกดสูตรอาหารแนะนำ
  const handleHorizontalCardPress = (Recipe: Recipe) => {
    router.push({
      pathname: '/recipedetail',
      params: {
        id: Recipe.id,
        title: Recipe.title,
        cooking_time: Recipe.cooking_time,
        description: Recipe.description,
        image: Recipe.recipe_images?.[0]?.image_url,
        created_at: Recipe.created_at,
        location: Recipe.location,
        difficulty: Recipe.difficulty // เพิ่มการส่งค่าความยาก
      }
    })
  }

  // ฟังก์ชันจัดการการกดสูตรอาหาร
  const handleRecipeCardPress = (Recipe: Recipe) => {
    router.push({
      pathname: '/recipedetail',
      params: {
        id: Recipe.id,
        title: Recipe.title,
        cooking_time: Recipe.cooking_time,
        description: Recipe.description,
        image: Recipe.recipe_images?.[0]?.image_url,
        created_at: Recipe.created_at,
        location: Recipe.location,
        difficulty: Recipe.difficulty // เพิ่มการส่งค่าความยาก
      }
    })
  }

  useEffect(() => {
    const initializeRecipes = async () => {
      setRefreshing(true); // เปลี่ยนสถานะเป็นกำลังรีเฟรช
      await Promise.all([
        fetchRecipes(0), // ดึงข้อมูลสูตรอาหารใหม่
        fetchHilightRecipes(),
        fetchConditions() // ดึงข้อมูลระดับความยาก
      ]);
      setRefreshing(false); // อัปเดตสถานะเป็นไม่กำลังรีเฟรช
    };

    initializeRecipes(); // เรียกใช้ฟังก์ชันเพื่อเริ่มต้นข้อมูล
  }, []);

  LogBox.ignoreAllLogs();

  return (
    <SafeAreaView className="h-full">
      <View className="h-full">
        <FlatList
          ListHeaderComponent={() => (
            <View className="flex py-6 space-y-6">
              <View className="flex justify-between items-start flex-row mb-6 px-4">
                <View>
                  <Text className="font-pmedium text-md text-gray-100">
                    ยินดีต้อนรับ
                  </Text>
                  <Text className="text-2xl text-white">
                    {session?.user?.user_metadata?.displayName || 'บุคคลทั่วไป'}
                  </Text>
                </View>

                <View className="mt-1.5">
                  <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                    <Image
                      source={{ 
                        uri: avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png',
                        cache: 'reload'
                      }}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        console.error('Image loading error:', e.nativeEvent.error)
                        setAvatarUrl(null)
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <SearchInput 
                initialQuery={searchQuery} 
                onChangeText={handleSearch}
                placeholder="ค้นหาสูตรอาหาร..."
              />

              {isSearching && (
                <View className="py-2 items-center">
                  <ActivityIndicator size="small" color="#0284c7" />
                  <Text className="text-gray-500 mt-1">กำลังค้นหา...</Text>
                </View>
              )}

              {!searchQuery.trim() && (
                <>
                  <View className="w-full flex-1 pt-5 px-4">
                    <Text className="text-lg font-pregular text-gray-100">
                      สูตรอาหารแนะนำ
                    </Text>
                  </View>
                  <FlatList
                    horizontal
                    data={hilightRecipes}
                    keyExtractor={(item) => `hilight_${item.id}`}
                    renderItem={({ item }) => (
                      <HorizontalCard
                        image={item.recipe_images?.[0]?.image_url || 'https://png.pngtree.com/png-vector/20230215/ourmid/pngtree-cooking-logo-png-image_6601988.png'}
                        title={item.title}
                        averageRating={item.averageRating} // เพิ่มการส่งค่า averageRating
                        onPress={() => handleHorizontalCardPress(item)}
                      />
                    )}
                    showsHorizontalScrollIndicator={false}
                    className="mt-4"
                    ListEmptyComponent={() => (
                      <View className="px-4">
                        <Text className="text-gray-500">
                          ไม่มีสูตรอาหารแนะนำ
                        </Text>
                      </View>
                    )}
                  />
                </>
              )}
            </View>
          )}
          ItemSeparatorComponent={() => (
            <View 
              className={`h-[1px] mx-8 ${
                theme === 'dark' ? 'bg-gray-200' : 'bg-gray-200'
              }`}
            />
          )}
          data={filteredRecipes}
          keyExtractor={(item) => `recipe_${item.id}`}
          renderItem={({ item }) => (
            <RecipeCard
            title={item.title}
            cooking_time={`เวลาทำโดยประมาณ : ${item.cooking_time} นาที`}
            image={item.recipe_images?.[0]?.image_url || 'https://png.pngtree.com/png-vector/20230215/ourmid/pngtree-cooking-logo-png-image_6601988.png'}
            postDate={formatDate(item.created_at)}
            description={getLocalizedConditionName(item.difficulty)}
            averageRating={item.averageRating} // เพิ่มการส่งค่า averageRating
            onPress={() => handleRecipeCardPress(item)}
          />
          )}
          ListEmptyComponent={() => (
            <View className="p-4">
              <Text className="text-center">
                {searchQuery.trim() ? 'ไม่พบสูตรอาหารที่ค้นหา' : 'ไม่พบสูตรอาหาร'}
              </Text>
            </View>
          )}
          onEndReached={loadMore} // เรียกใช้ฟังก์ชันเพื่อโหลดข้อมูลเพิ่มเมื่อเลื่อนถึงจุดสิ้นสุดของรายการ
          onEndReachedThreshold={0.5} // ระยะที่จะเริ่มโหลดข้อมูลเพิ่มเมื่อเลื่อนถึงจุดสิ้นสุดของรายการ
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={() => (
            isLoadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" />
              </View>
            ) : null
          )}
        />
      </View>
    </SafeAreaView>
  )
}