export interface CategoryNode { name: string; terminal: boolean; children?: CategoryNode[] }
const leaf = (...names: string[]): CategoryNode[] => names.map(name => ({name, terminal:true}));
export const INITIAL_CATEGORY_TREE: CategoryNode[] = [
  {name:'Characters',terminal:false,children:[{name:'Humans',terminal:false,children:leaf('Men','Women','Boys','Girls','Babies','Elderly','Groups')}]},
  {name:'Animals',terminal:false,children:[{name:'Mammals',terminal:false,children:leaf('Domestic','Wildlife','Marine')},...leaf('Birds','Fish','Reptiles','Amphibians','Insects','Arachnids')]},
  {name:'Vegetation',terminal:false,children:leaf('Trees','Bushes','Shrubs','Grass','Flowers','Crops','Vines','Aquatic','Dead')},
  {name:'Architecture',terminal:false,children:leaf('Houses','Castles','Fortifications','Religious','Industrial','Agricultural','Shops','Public','Interiors','Ruins','Bridges','Walls','Towers','Modular')},
  {name:'Props',terminal:false,children:leaf('Furniture','Tools','Weapons','Armor','Clothing','Containers','Household','Workshop','Farming','Market','Books','Lighting','Decoration','Musical','Misc')},
  {name:'Vehicles',terminal:false,children:leaf('Carts','Wagons','Boats','Ships','Land','Air','Rail','Fantasy')},
  {name:'Environment',terminal:false,children:leaf('Rocks','Cliffs','Terrain','Mountains','Caves','Water','Roads','Paths','Fences','Debris')},
  {name:'Food',terminal:false,children:leaf('Fruit','Vegetables','Meat','Fish','Bread','Meals','Drinks','Ingredients')},
  {name:'Structures',terminal:false,children:leaf('Wells','Fences','Gates','Scaffolding','Docks','Stairs','Platforms','Misc')},
  {name:'Effects',terminal:false,children:leaf('Fire','Smoke','Magic','Weather','Destruction','Misc')},
  {name:'Animations',terminal:false,children:leaf('Humanoid','Quadruped','Bird','Fish','Creature','Other')},
  {name:'Collections',terminal:false,children:leaf('SceneSets','BuildingSets','PropSets','CharacterSets','EnvironmentSets')},
  {name:'Unsorted',terminal:true}
];
