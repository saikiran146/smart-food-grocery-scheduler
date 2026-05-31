import { PrismaClient, RecipeCuisine } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================
  // INGREDIENTS
  // ============================================================
  const ingredients = [
    { name: 'Rice', category: 'RICE', defaultUnit: 'KG' },
    { name: 'Basmati Rice', category: 'RICE', defaultUnit: 'KG' },
    { name: 'Rajma', category: 'PULSES', defaultUnit: 'G' },
    { name: 'Chana Dal', category: 'PULSES', defaultUnit: 'G' },
    { name: 'Toor Dal', category: 'PULSES', defaultUnit: 'G' },
    { name: 'Moong Dal', category: 'PULSES', defaultUnit: 'G' },
    { name: 'Chicken', category: 'MEAT', defaultUnit: 'KG' },
    { name: 'Mutton', category: 'MEAT', defaultUnit: 'KG' },
    { name: 'Paneer', category: 'DAIRY', defaultUnit: 'G' },
    { name: 'Curd', category: 'DAIRY', defaultUnit: 'G' },
    { name: 'Milk', category: 'DAIRY', defaultUnit: 'LITER' },
    { name: 'Onion', category: 'VEGETABLES', defaultUnit: 'KG' },
    { name: 'Tomato', category: 'VEGETABLES', defaultUnit: 'KG' },
    { name: 'Potato', category: 'VEGETABLES', defaultUnit: 'KG' },
    { name: 'Ginger', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Garlic', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Green Chilli', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Turmeric Powder', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Cumin Seeds', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Mustard Seeds', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Coriander Powder', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Garam Masala', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Red Chilli Powder', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Oil', category: 'OILS', defaultUnit: 'LITER' },
    { name: 'Ghee', category: 'OILS', defaultUnit: 'G' },
    { name: 'Bay Leaves', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Cardamom', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Cloves', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Cinnamon', category: 'SPICES', defaultUnit: 'G' },
    { name: 'Cauliflower', category: 'VEGETABLES', defaultUnit: 'KG' },
    { name: 'Peas', category: 'VEGETABLES', defaultUnit: 'G' },
    { name: 'Spinach', category: 'VEGETABLES', defaultUnit: 'G' },
    { name: 'Capsicum', category: 'VEGETABLES', defaultUnit: 'G' },
  ];

  const createdIngredients: Record<string, any> = {};
  for (const ing of ingredients) {
    const created = await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: {},
      create: ing as any,
    });
    createdIngredients[ing.name] = created;
  }

  // ============================================================
  // RECIPES
  // ============================================================
  const recipes = [
    {
      name: 'Rajma Chawal',
      description: 'Classic North Indian kidney bean curry served with steamed rice.',
      cuisine: RecipeCuisine.NORTH_INDIAN,
      isVegetarian: true,
      servings: 4,
      prepTimeMinutes: 480, // overnight soaking
      cookTimeMinutes: 60,
      difficulty: 'MEDIUM',
      instructions: [
        'Soak rajma overnight in water.',
        'Pressure cook soaked rajma with salt for 4-5 whistles until tender.',
        'Heat oil in a pan, add cumin seeds and let them splutter.',
        'Add chopped onions and sauté until golden brown.',
        'Add ginger-garlic paste and cook for 2 minutes.',
        'Add chopped tomatoes, turmeric, coriander powder, red chilli powder, and cook until oil separates.',
        'Add cooked rajma with its water. Mash some beans for thick gravy.',
        'Simmer for 15-20 minutes. Add garam masala and garnish with coriander.',
        'Serve hot with steamed rice.',
      ],
      tags: ['vegetarian', 'protein-rich', 'comfort food', 'north-indian'],
      estimatedCost: 120,
      calories: 380,
      protein: 15,
      carbs: 65,
      fat: 8,
      ingredients: [
        { name: 'Rajma', quantity: 300, unit: 'G' },
        { name: 'Rice', quantity: 500, unit: 'G' },
        { name: 'Onion', quantity: 200, unit: 'G' },
        { name: 'Tomato', quantity: 200, unit: 'G' },
        { name: 'Ginger', quantity: 20, unit: 'G' },
        { name: 'Garlic', quantity: 20, unit: 'G' },
        { name: 'Oil', quantity: 0.05, unit: 'LITER' },
        { name: 'Cumin Seeds', quantity: 5, unit: 'G' },
        { name: 'Turmeric Powder', quantity: 3, unit: 'G' },
        { name: 'Coriander Powder', quantity: 10, unit: 'G' },
        { name: 'Garam Masala', quantity: 5, unit: 'G' },
        { name: 'Red Chilli Powder', quantity: 5, unit: 'G' },
      ],
    },
    {
      name: 'Chicken Biryani',
      description: 'Aromatic and flavorful chicken biryani with whole spices and saffron.',
      cuisine: RecipeCuisine.NORTH_INDIAN,
      isVegetarian: false,
      servings: 6,
      prepTimeMinutes: 60,
      cookTimeMinutes: 90,
      difficulty: 'HARD',
      instructions: [
        'Marinate chicken with curd, turmeric, red chilli powder, garam masala, and salt for 1 hour.',
        'Wash and soak basmati rice for 30 minutes.',
        'Boil rice with whole spices (bay leaf, cardamom, cloves, cinnamon) until 70% cooked.',
        'Heat ghee in a heavy-bottomed pan. Add sliced onions and fry until golden and crispy.',
        'Add marinated chicken and cook on high heat for 5 minutes.',
        'Add chopped tomatoes, ginger-garlic paste and cook until chicken is half done.',
        'Layer the par-cooked rice over the chicken.',
        'Drizzle saffron milk, fried onions, and fresh mint on top.',
        'Cook on dum (low flame) for 30-35 minutes.',
        'Gently mix before serving with raita.',
      ],
      tags: ['non-vegetarian', 'festive', 'rice', 'mughlai'],
      estimatedCost: 350,
      calories: 520,
      protein: 35,
      carbs: 60,
      fat: 18,
      ingredients: [
        { name: 'Chicken', quantity: 1, unit: 'KG' },
        { name: 'Basmati Rice', quantity: 500, unit: 'G' },
        { name: 'Curd', quantity: 200, unit: 'G' },
        { name: 'Onion', quantity: 300, unit: 'G' },
        { name: 'Tomato', quantity: 150, unit: 'G' },
        { name: 'Ginger', quantity: 30, unit: 'G' },
        { name: 'Garlic', quantity: 30, unit: 'G' },
        { name: 'Ghee', quantity: 50, unit: 'G' },
        { name: 'Bay Leaves', quantity: 3, unit: 'G' },
        { name: 'Cardamom', quantity: 5, unit: 'G' },
        { name: 'Cloves', quantity: 5, unit: 'G' },
        { name: 'Cinnamon', quantity: 5, unit: 'G' },
        { name: 'Garam Masala', quantity: 10, unit: 'G' },
        { name: 'Red Chilli Powder', quantity: 8, unit: 'G' },
        { name: 'Turmeric Powder', quantity: 3, unit: 'G' },
      ],
    },
    {
      name: 'Dal Fry',
      description: 'Tempered lentil curry with a rich, smoky flavour.',
      cuisine: RecipeCuisine.NORTH_INDIAN,
      isVegetarian: true,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 40,
      difficulty: 'EASY',
      instructions: [
        'Wash and pressure cook toor dal with turmeric and salt for 3 whistles.',
        'Heat oil/ghee in a pan. Add cumin seeds and let them splutter.',
        'Add dried red chillies and asafoetida.',
        'Add finely chopped onions and sauté until light brown.',
        'Add ginger-garlic paste and cook until raw smell is gone.',
        'Add chopped tomatoes and cook until mushy.',
        'Add red chilli powder and coriander powder.',
        'Mix cooked dal into the tempering. Adjust consistency with water.',
        'Simmer for 10 minutes. Finish with garam masala and lemon juice.',
        'Garnish with fresh coriander and serve with roti or rice.',
      ],
      tags: ['vegetarian', 'high-protein', 'everyday', 'easy'],
      estimatedCost: 80,
      calories: 280,
      protein: 14,
      carbs: 42,
      fat: 6,
      ingredients: [
        { name: 'Toor Dal', quantity: 250, unit: 'G' },
        { name: 'Onion', quantity: 150, unit: 'G' },
        { name: 'Tomato', quantity: 150, unit: 'G' },
        { name: 'Ginger', quantity: 15, unit: 'G' },
        { name: 'Garlic', quantity: 15, unit: 'G' },
        { name: 'Oil', quantity: 0.03, unit: 'LITER' },
        { name: 'Cumin Seeds', quantity: 5, unit: 'G' },
        { name: 'Turmeric Powder', quantity: 3, unit: 'G' },
        { name: 'Coriander Powder', quantity: 8, unit: 'G' },
        { name: 'Red Chilli Powder', quantity: 5, unit: 'G' },
        { name: 'Garam Masala', quantity: 3, unit: 'G' },
      ],
    },
    {
      name: 'Aloo Gobi',
      description: 'Dry curry of potatoes and cauliflower tempered with spices.',
      cuisine: RecipeCuisine.NORTH_INDIAN,
      isVegetarian: true,
      servings: 4,
      prepTimeMinutes: 15,
      cookTimeMinutes: 25,
      difficulty: 'EASY',
      instructions: [
        'Cut potatoes into cubes and cauliflower into florets.',
        'Heat oil in a wok. Add cumin seeds and mustard seeds.',
        'Add green chilli and ginger. Sauté for 1 minute.',
        'Add potatoes first and cook on medium flame for 5 minutes.',
        'Add cauliflower, turmeric, red chilli powder, and coriander powder.',
        'Stir well, cover and cook on low flame for 15 minutes.',
        'Uncover, add garam masala and cook until vegetables are tender.',
        'Garnish with fresh coriander. Serve with roti.',
      ],
      tags: ['vegetarian', 'dry curry', 'north-indian', 'everyday'],
      estimatedCost: 60,
      calories: 180,
      protein: 5,
      carbs: 28,
      fat: 6,
      ingredients: [
        { name: 'Potato', quantity: 300, unit: 'G' },
        { name: 'Cauliflower', quantity: 400, unit: 'G' },
        { name: 'Oil', quantity: 0.03, unit: 'LITER' },
        { name: 'Cumin Seeds', quantity: 5, unit: 'G' },
        { name: 'Mustard Seeds', quantity: 3, unit: 'G' },
        { name: 'Green Chilli', quantity: 10, unit: 'G' },
        { name: 'Ginger', quantity: 10, unit: 'G' },
        { name: 'Turmeric Powder', quantity: 3, unit: 'G' },
        { name: 'Red Chilli Powder', quantity: 5, unit: 'G' },
        { name: 'Coriander Powder', quantity: 8, unit: 'G' },
        { name: 'Garam Masala', quantity: 3, unit: 'G' },
      ],
    },
    {
      name: 'Palak Paneer',
      description: 'Fresh cottage cheese cubes in a creamy spinach sauce.',
      cuisine: RecipeCuisine.NORTH_INDIAN,
      isVegetarian: true,
      servings: 4,
      prepTimeMinutes: 20,
      cookTimeMinutes: 30,
      difficulty: 'MEDIUM',
      instructions: [
        'Blanch spinach in boiling water for 2 minutes, then in ice water.',
        'Blend spinach with green chilli into smooth puree.',
        'Fry paneer cubes in oil until golden. Set aside.',
        'In the same pan, heat oil and add cumin seeds.',
        'Add chopped onions, cook until golden.',
        'Add ginger-garlic paste and cook 2 minutes.',
        'Add tomato puree and cook until oil separates.',
        'Add spinach puree, cream, and spices. Simmer 10 minutes.',
        'Add fried paneer, cook 5 more minutes.',
        'Serve hot with naan or roti.',
      ],
      tags: ['vegetarian', 'protein-rich', 'iron-rich', 'creamy'],
      estimatedCost: 160,
      calories: 320,
      protein: 18,
      carbs: 15,
      fat: 22,
      ingredients: [
        { name: 'Paneer', quantity: 300, unit: 'G' },
        { name: 'Spinach', quantity: 500, unit: 'G' },
        { name: 'Onion', quantity: 150, unit: 'G' },
        { name: 'Tomato', quantity: 100, unit: 'G' },
        { name: 'Ginger', quantity: 20, unit: 'G' },
        { name: 'Garlic', quantity: 20, unit: 'G' },
        { name: 'Green Chilli', quantity: 15, unit: 'G' },
        { name: 'Oil', quantity: 0.04, unit: 'LITER' },
        { name: 'Cumin Seeds', quantity: 5, unit: 'G' },
        { name: 'Garam Masala', quantity: 5, unit: 'G' },
        { name: 'Turmeric Powder', quantity: 2, unit: 'G' },
      ],
    },
  ];

  for (const recipe of recipes) {
    const { ingredients: recipeIngredients, ...recipeData } = recipe;

    // Skip if already seeded
    const existing = await prisma.recipe.findFirst({ where: { name: recipe.name } });
    if (existing) {
      createdIngredients[`recipe:${recipe.name}`] = existing;
      continue;
    }

    const created = await prisma.recipe.create({
      data: {
        ...recipeData,
        instructions: recipeData.instructions,
        tags: recipeData.tags,
      },
    });

    for (const ing of recipeIngredients) {
      const ingredient = createdIngredients[ing.name];
      if (!ingredient) continue;

      await prisma.recipeIngredient.upsert({
        where: { recipeId_ingredientId: { recipeId: created.id, ingredientId: ingredient.id } },
        update: {},
        create: {
          recipeId: created.id,
          ingredientId: ingredient.id,
          quantity: ing.quantity,
          unit: ing.unit as any,
        },
      });
    }
  }

  console.log(`✅ Seeded ${Object.keys(createdIngredients).length} ingredients`);
  console.log(`✅ Seeded ${recipes.length} Indian recipes`);
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
