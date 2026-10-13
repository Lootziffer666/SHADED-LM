export interface CategoryNode {
  name: string;
  terminal: boolean;
  children?: CategoryNode[];
}

const terminal = (name: string): CategoryNode => ({ name, terminal: true });
const branch = (name: string, children: CategoryNode[]): CategoryNode => ({ name, terminal: false, children });

export const INITIAL_CATEGORY_TREE: CategoryNode[] = [
  branch('Characters', [
    branch('Humans', [
      terminal('Men'),
      terminal('Women'),
      terminal('Boys'),
      terminal('Girls'),
      terminal('Babies'),
      terminal('Elderly'),
      terminal('Groups'),
    ]),
  ]),
  branch('Animals', [
    branch('Mammals', [terminal('Domestic'), terminal('Wildlife'), terminal('Marine')]),
    terminal('Birds'),
    terminal('Fish'),
    terminal('Reptiles'),
    terminal('Amphibians'),
    terminal('Insects'),
    terminal('Arachnids'),
  ]),
  branch('Vegetation', [
    terminal('Trees'),
    terminal('Bushes'),
    terminal('Shrubs'),
    terminal('Grass'),
    terminal('Flowers'),
    terminal('Crops'),
    terminal('Vines'),
    terminal('Aquatic'),
    terminal('Dead'),
  ]),
  branch('Architecture', [
    terminal('Houses'),
    terminal('Castles'),
    terminal('Fortifications'),
    terminal('Religious'),
    terminal('Industrial'),
    terminal('Agricultural'),
    terminal('Shops'),
    terminal('Public'),
    terminal('Interiors'),
    terminal('Ruins'),
    terminal('Bridges'),
    terminal('Walls'),
    terminal('Towers'),
    terminal('Modular'),
  ]),
  branch('Props', [
    terminal('Furniture'),
    terminal('Tools'),
    terminal('Weapons'),
    terminal('Armor'),
    terminal('Clothing'),
    terminal('Containers'),
    terminal('Household'),
    terminal('Workshop'),
    terminal('Farming'),
    terminal('Market'),
    terminal('Books'),
    terminal('Lighting'),
    terminal('Decoration'),
    terminal('Musical'),
    terminal('Misc'),
  ]),
  branch('Vehicles', [terminal('Carts'), terminal('Wagons'), terminal('Boats'), terminal('Ships'), terminal('Land'), terminal('Air'), terminal('Rail')]),
  branch('Environment', [terminal('Rocks'), terminal('Cliffs'), terminal('Terrain'), terminal('Mountains'), terminal('Caves'), terminal('Water'), terminal('Roads'), terminal('Paths'), terminal('Fences'), terminal('Debris')]),
  branch('Food', [terminal('Fruit'), terminal('Vegetables'), terminal('Meat'), terminal('Fish'), terminal('Bread'), terminal('Meals'), terminal('Drinks'), terminal('Ingredients')]),
  branch('Structures', [terminal('Wells'), terminal('Fences'), terminal('Gates'), terminal('Scaffolding'), terminal('Docks'), terminal('Stairs'), terminal('Platforms'), terminal('Misc')]),
  branch('Effects', [terminal('Fire'), terminal('Smoke'), terminal('Magic'), terminal('Weather'), terminal('Destruction'), terminal('Misc')]),
  branch('Animations', [terminal('Humanoid'), terminal('Quadruped'), terminal('Bird'), terminal('Fish'), terminal('Creature'), terminal('Misc')]),
  branch('Collections', [terminal('SceneSets'), terminal('BuildingSets'), terminal('PropSets'), terminal('CharacterSets'), terminal('EnvironmentSets')]),
  terminal('Unsorted'),
];
