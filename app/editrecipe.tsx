import React, { useState, useEffect } from 'react'
import { ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, Modal, Pressable, SafeAreaView } from 'react-native'
import { View } from '@/components/Themed'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/providers/ThemeProvider'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/utils/supabase'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'
import { FontAwesome } from '@expo/vector-icons'
import CustomButton from '@/components/CustomButton'
import * as ImageManipulator from 'expo-image-manipulator';
import CustomAlert from '@/components/CustomAlert'
import { Text } from "@/components/CustomText"

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

interface Recipes {
  id: number
  title: string
  cooking_time: number
  description: string
  category_id: number
  difficulty: number
  updated_at: string
  recipe_images?: {
    id: number
    image_url: string
  }[]
}

export default function EditRecipes() {
  const params = useLocalSearchParams()
  const { theme } = useTheme()
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  
  // สถานะสำหรับข้อมูลสูตรอาหาร
  const [title, setTitle] = useState('')
  const [cooking_time, setcooking_time] = useState('')
  const [description, setDescription] = useState('')
  const [origin, setorigin] = useState('')
  const [categoryId, setCategoryId] = useState<number>(0)
  const [DifficultyId, setDifficultyId] = useState<number>(0)
  const [images, setImages] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [Conditions, setConditions] = useState<Difficulty[]>([])
  const [existingImages, setExistingImages] = useState<Array<{
    id: number;
    image_url: string;
  }>>([]);

  // เพิ่ม state สำหรับ modal
  const [categoryModalVisible, setCategoryModalVisible] = useState(false)
  const [DifficultyModalVisible, setDifficultyModalVisible] = useState(false)

  // Add alert config state after other useState declarations
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

  // ดึงข้อมูลสูตรอาหารที่ต้องการแก้ไข
  useEffect(() => {
    fetchRecipesDetails()
    fetchCategories()
    fetchConditions()
  }, [params.id])

  useEffect(() => {
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const fetchRecipesDetails = async () => {
    try {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_images (
            id,
            image_url
          )
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error

      if (recipes) {
        setTitle(recipes.title)
        setcooking_time(recipes.cooking_time.toString())
        setDescription(recipes.description)
        setCategoryId(recipes.category_id)
        setDifficultyId(recipes.difficulty)
        setorigin(recipes.origin)
        setExistingImages(recipes.recipe_images || [])
      }
    } catch (error) {
      console.error('Error fetching recipes details:', error)
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to load recipes details',
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('status', true)
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchConditions = async () => {
    try {
      const { data, error } = await supabase
        .from('conditions')
        .select('*')
        .eq('status', true)
      if (error) throw error
      setConditions(data || [])
    } catch (error) {
      console.error('Error fetching Conditions:', error)
    }
  }

  const getLocalizedName = (item: Category | Difficulty) => {
    return i18n.language === 'th' ? item.name_th : item.name_en
  }

  const pickImage = async () => {
    try {
      const totalImages = existingImages.length + images.length;
      if (totalImages >= 5) {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('recipes.alerts.imageLimit.upload'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            }
          ]
        });
        return;
      }

      // ตรวจสอบ permission ก่อนแสดง popup
      const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
      const libraryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!cameraPermission.granted && !libraryPermission.granted) {
        // ถ้ายังไม่ได้ permission ให้ขอใหม่
        const newCameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        const newLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!newCameraPermission.granted && !newLibraryPermission.granted) {
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: t('create.imagePicker.permissionError'),
            buttons: [
              {
                text: t('common.ok'),
                onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
              }
            ]
          });
          return;
        }
      }

      const remainingSlots = 5 - totalImages;

      setAlertConfig(prev => ({ ...prev, visible: false }));
      await new Promise(resolve => setTimeout(resolve, 500));

      setAlertConfig({
        visible: true,
        title: t('create.imagePicker.title'),
        message: t('create.imagePicker.message'),
        buttons: [
          {
            text: t('create.imagePicker.camera'),
            onPress: async () => {
              const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
              if (!cameraPermission.granted) {
                const newPermission = await ImagePicker.requestCameraPermissionsAsync();
                if (!newPermission.granted) {
                  setAlertConfig({
                    visible: true,
                    title: t('common.error'),
                    message: t('create.imagePicker.cameraPermissionError'),
                    buttons: [
                      {
                        text: t('common.ok'),
                        onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                      }
                    ]
                  });
                  return;
                }
              }
              // setAlertConfig(prev => ({ ...prev, visible: false }));
              // await new Promise(resolve => setTimeout(resolve, 500));
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.5,
                base64: true,
              });
              setAlertConfig(prev => ({ ...prev, visible: false }));
              await new Promise(resolve => setTimeout(resolve, 500));
              if (!result.canceled) {
                handleImageResult(result);
              }
            }
          },
          {
            text: t('create.imagePicker.library'),
            onPress: async () => {
              const libraryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
              if (!libraryPermission.granted) {
                const newPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!newPermission.granted) {
                  setAlertConfig({
                    visible: true,
                    title: t('common.error'),
                    message: t('create.imagePicker.galleryPermissionError'),
                    buttons: [
                      {
                        text: t('common.ok'),
                        onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                      }
                    ]
                  });
                  return;
                }
              }
              // setAlertConfig(prev => ({ ...prev, visible: false }));
              // await new Promise(resolve => setTimeout(resolve, 500));
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 0.5,
                base64: true,
                selectionLimit: remainingSlots,
              });
              setAlertConfig(prev => ({ ...prev, visible: false }));
              await new Promise(resolve => setTimeout(resolve, 500));
              if (!result.canceled) {
                handleImageResult(result);
              }
            }
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    } catch (error) {
      console.error('Error picking image:', error);
      await new Promise(resolve => setTimeout(resolve, 500));
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('editRecipe.alerts.error.image'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    }
  };

  const handleImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.assets) {
      return;
    }

    try {
      const resizedImages = await Promise.all(
        result.assets.map(async (asset: ImagePicker.ImageInfo) => {
          const { width, height } = asset;
          const aspectRatio = width / height;
          const targetSize = 1024;

          let cropSize;
          if (aspectRatio > 1) {
            cropSize = height;
            const offsetX = (width - height) / 2;
            const manipResult = await ImageManipulator.manipulateAsync(
              asset.uri,
              [
                { crop: { originX: offsetX, originY: 0, width: cropSize, height: cropSize } },
                { resize: { width: targetSize, height: targetSize } }
              ],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            return manipResult.base64 || '';
          } else {
            cropSize = width;
            const offsetY = (height - width) / 2;
            const manipResult = await ImageManipulator.manipulateAsync(
              asset.uri,
              [
                { crop: { originX: 0, originY: offsetY, width: cropSize, height: cropSize } },
                { resize: { width: targetSize, height: targetSize } }
              ],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            return manipResult.base64 || '';
          }
        })
      ).then(images => images.filter(base64 => base64 !== ''));

      setImages([...images, ...resizedImages]);
    } catch (error) {
      console.error('Error processing images:', error);
      Alert.alert(t('common.error'), t('editRecipe.alerts.error.image'));
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  }

  const handleUpdateRecipe = async () => {
    try {
      console.log('Updating recipes...')
  
      if (!title || !cooking_time || !description || !categoryId || !DifficultyId || !origin) {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('editRecipe.alerts.validation.required'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            }
          ]
        });
        return;
      }
  
      setLoading(true);
      try {
        // แก้ไขจาก 'recipess' เป็น 'recipes'
        const { error: updateError } = await supabase
          .from('recipes')
          .update({
            title,
            cooking_time: parseFloat(cooking_time),
            description,
            category_id: categoryId,
            difficulty: DifficultyId,
            origin: origin,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)
  
        if (updateError) {
          console.error('Update error:', updateError)
          throw updateError
        }
  
        console.log('recipes updated successfully')
  
        if (images.length > 0) {
          for (const base64Image of images) {
            // แก้ไขจาก 'recipes-images' เป็น 'recipe-images'
            const fileName = `recipes_${params.id}_${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage
              .from('recipe-images')
              .upload(fileName, decode(base64Image), {
                contentType: 'image/jpeg',
                upsert: true,
              })
  
            if (uploadError) {
              console.error('Upload error:', uploadError)
              throw uploadError
            }
  
            const { data } = supabase.storage
              .from('recipe-images')
              .getPublicUrl(fileName)
  
            const { error: imageError } = await supabase
              .from('recipe_images')
              .insert({
                recipe_id: params.id,
                image_url: data.publicUrl,
              })
  
            if (imageError) {
              console.error('Image insert error:', imageError)
              throw imageError
            }
          }
        }
  
        // รอสักครู่ก่อนแสดง success alert
        await new Promise(resolve => setTimeout(resolve, 500));
  
        setAlertConfig({
          visible: true,
          title: t('editRecipe.alerts.success'),
          message: t('editRecipe.alerts.successMessage'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.back();
              }
            }
          ]
        });
      } catch (error) {
        console.error('Error updating recipes:', error)
        setAlertConfig({
          visible: true,
          title: t('editRecipe.alerts.error'),
          message: t('editRecipe.alerts.validation.required'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating recipes:', error);
  
      // รอสักครู่ก่อนแสดง error alert
      await new Promise(resolve => setTimeout(resolve, 500));
  
      setAlertConfig({
        visible: true,
        title: t('editRecipe.alerts.error'),
        message: t('editRecipe.alerts.validation.required'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    }
  }

  const removeExistingImage = async (imageId: number, imageUrl: string) => {
    setAlertConfig({
      visible: true,
      title: t('common.confirm'),
      message: t('editRecipe.alerts.confirmDelete'),
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
              const { error: deleteError } = await supabase
                .from('recipe_images')
                .delete()
                .eq('id', imageId);
  
              if (deleteError) throw deleteError;
  
              const fileName = imageUrl.split('/').pop();
              if (fileName) {
                // แก้ไขจาก 'recipes-images' เป็น 'recipe-images'
                const { error: storageError } = await supabase.storage
                  .from('recipe-images')
                  .remove([fileName]);
  
                if (storageError) throw storageError;
              }
  
              setExistingImages(existingImages.filter(img => img.id !== imageId));
              setAlertConfig({
                visible: true,
                title: t('editRecipe.alerts.success'),
                message: t('editRecipe.alerts.imageDelete.success'),
                buttons: [
                  {
                    text: t('common.ok'),
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                  }
                ]
              });
            } catch (error) {
              console.error('Error removing image:', error);
              setAlertConfig({
                visible: true,
                title: t('common.error'),
                message: t('editRecipe.alerts.imageDelete.error'),
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
          headerTitle: t('editRecipe.title'),
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
      
      {/* Loading Indicator */}
      {loading && (
        <View className="absolute inset-0 justify-center items-center bg-black bg-opacity-50">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      <ScrollView 
        className="h-full" 
        contentContainerStyle={{ 
          backgroundColor: theme === 'dark' ? '#000' : '#fff'
        }}
      >
        <View 
          className="px-4 pb-5 pt-4 !bg-transparent"
          style={{
            backgroundColor: theme === 'dark' ? '#000' : '#fff'
          }}
        >
          {/* Title Input */}
          <Text weight="regular" className="mb-2">
            {t('editRecipe.titlePlaceholder')}
          </Text>
          <TextInput
            className={`p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'border-gray-700 text-white' 
                : 'border-gray-300 text-black'
            }`}
            value={title}
            onChangeText={setTitle}
            placeholder={t('editRecipe.titlePlaceholder')}
            placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
            style={{ fontFamily: 'NotoSansThai-Regular' }}
          />

          {/* cooking_time Input */}
        <View className="my-4 !bg-transparent">
            <Text className="mb-2">{t('editRecipe.cooking_timeLabel')}</Text>
            <TextInput
              className={`p-4 rounded-lg border ${
                theme === 'dark' 
                  ? 'border-gray-700 text-white' 
                  : 'border-gray-300 text-black'
              }`}
              value={cooking_time}
              onChangeText={setcooking_time}
              keyboardType="numeric"
              placeholder={t('editRecipe.cooking_timePlaceholder')}
              placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
              style={{ fontFamily: 'NotoSansThai-Regular' }}
            />
        </View>

        {/* Description Input */}
        <View className="mb-4 !bg-transparent">
            <Text className="mb-2">{t('editRecipe.descriptionLabel')}</Text>
            <TextInput
              className={`p-4 rounded-lg border ${
                theme === 'dark' 
                  ? 'border-gray-700 text-white' 
                  : 'border-gray-300 text-black'
              }`}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder={t('editRecipe.descriptionPlaceholder')}
              placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
              style={{ fontFamily: 'NotoSansThai-Regular' }}
            />
        </View>

        {/* origin Input */}
        <View className="mb-4 !bg-transparent">
          <Text className="mb-2">{t('create.placeholders.origin')}</Text>
          <TextInput
            className={`p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'border-gray-700 text-white' 
                : 'border-gray-300 text-black'
            }`}
            value={origin}
            onChangeText={setorigin}
            placeholder={t('editRecipe.originPlaceholder')}
            placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
            style={{ fontFamily: 'NotoSansThai-Regular' }}
          />
        </View>

          {/* Category Picker */}
          <View className="my-2 !bg-transparent">
            <Text className="mb-2">{t('editRecipe.categoryLabel')}</Text>
            <Pressable
              className={`flex-row items-center my-2 py-4 px-4 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
              onPress={() => setCategoryModalVisible(true)}
              android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
            >
              <Text className="flex-1">
                {categoryId 
                  ? categories.find(c => c.id === categoryId)
                    ? getLocalizedName(categories.find(c => c.id === categoryId)!)
                    : t('editRecipe.selectCategory')
                  : t('editRecipe.selectCategory')
                }
              </Text>
              <FontAwesome name="chevron-down" size={10} color={theme === 'dark' ? '#fff' : '#4A4A4A'} />
            </Pressable>
          </View>

          {/* Difficulty Picker */}
          <View className="mb-4 !bg-transparent">
            <Text className="mb-2">{t('editRecipe.conditionLabel')}</Text> {/* เปลี่ยนจาก DifficultyLabel เป็น conditionLabel */}
            <Pressable
                className={`flex-row items-center my-2 py-4 px-4 rounded-lg border ${
                theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => setDifficultyModalVisible(true)}
                android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
            >
                <Text className="flex-1">
                {DifficultyId 
                    ? Conditions.find(c => c.id === DifficultyId)
                    ? getLocalizedName(Conditions.find(c => c.id === DifficultyId)!)
                    : t('editRecipe.selectCondition') // เปลี่ยนจาก selectDifficulty เป็น selectCondition
                    : t('editRecipe.selectCondition') // เปลี่ยนจาก selectDifficulty เป็น selectCondition
                }
                </Text>
                <FontAwesome name="chevron-down" size={10} color={theme === 'dark' ? '#fff' : '#4A4A4A'} />
            </Pressable>
        </View>


          {/* Existing Images */}
          <View className="mb-4 !bg-transparent">
            <Text className="mb-2">{t('editRecipe.existingImages')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingImages.map((img) => (
                <View key={img.id} className="relative">
                  <Image
                    source={{ uri: img.image_url }}
                    className="w-20 h-20 rounded-lg mr-2"
                  />
                  <TouchableOpacity
                    onPress={() => removeExistingImage(img.id, img.image_url)}
                    className="absolute top-0 right-0 bg-red-500 rounded-full px-[5px] py-[3px] mx-3 mt-1"
                  >
                    <FontAwesome name="times" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* New Images */}
          <View className="mb-4 !bg-transparent">
            <Text className="mb-2">{t('editRecipe.newImages')}</Text>
            <TouchableOpacity
              onPress={pickImage}
              className={`p-4 rounded-lg border border-dashed ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
              }`}
            >
              <Text className="text-center">
                {t('editRecipe.addImages')}
              </Text>
            </TouchableOpacity>
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                {images.map((base64, index) => (
                  <View key={index} className="relative">
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${base64}` }}
                      className="w-20 h-20 rounded-lg mr-2"
                    />
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      className="absolute top-0 right-0 bg-red-500 rounded-full p-1 mx-3 mt-1"
                    >
                      <FontAwesome name="times" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Update Button */}
          <CustomButton
            title={t('editRecipe.updateButton')}
            handlePress={handleUpdateRecipe}
            isLoading={loading}
            containerStyles="mt-4"
            textStyles="!text-white"
          />

          {/* Category Modal */}
          <Modal
            visible={categoryModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setCategoryModalVisible(false)}
          >
            <Pressable 
              className="flex-1"
              onPress={() => setCategoryModalVisible(false)}
            >
              <View className="flex-1 justify-end !bg-black/50">
                <View className={`rounded-t-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <View className={`p-4 border-b flex-row justify-between items-center ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <Text className="text-lg font-medium">
                      {t('editRecipe.selectCategory')}
                    </Text>
                    <Pressable onPress={() => setCategoryModalVisible(false)}>
                      <FontAwesome 
                        name="times" 
                        size={20} 
                        color={theme === 'dark' ? '#fff' : '#4A4A4A'} 
                      />
                    </Pressable>
                  </View>
                  
                  <View className="p-4">
                    {categories.map((category) => (
                      <Pressable
                        key={category.id}
                        onPress={() => {
                          setCategoryId(category.id)
                          setCategoryModalVisible(false)
                        }}
                        className={`py-3 border-b ${
                          theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                        }`}
                        android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
                      >
                        <Text>{getLocalizedName(category)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </Pressable>
          </Modal>

          {/* Difficulty Modal */}
          <Modal
            visible={DifficultyModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setDifficultyModalVisible(false)}
        >
            <Pressable 
            className="flex-1"
            onPress={() => setDifficultyModalVisible(false)}
            >
            <View className="flex-1 justify-end !bg-black/50">
                <View className={`rounded-t-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <View className={`p-4 border-b flex-row justify-between items-center ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                    <Text className="text-lg font-medium">
                    {t('editRecipe.selectCondition')}
                    </Text>
                    <Pressable onPress={() => setDifficultyModalVisible(false)}>
                    <FontAwesome 
                        name="times" 
                        size={20} 
                        color={theme === 'dark' ? '#fff' : '#4A4A4A'} 
                    />
                    </Pressable>
                </View>

                <View className="p-4">
                    {Conditions.map((Difficulty) => (
                    <Pressable
                        key={Difficulty.id}
                        onPress={() => {
                        setDifficultyId(Difficulty.id)
                        setDifficultyModalVisible(false)
                        }}
                        className={`py-3 border-b ${
                        theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                        }`}
                        android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
                    >
                        <Text>{getLocalizedName(Difficulty)}</Text>
                    </Pressable>
                    ))}
                </View>
                </View>
            </View>
            </Pressable>
        </Modal>
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
