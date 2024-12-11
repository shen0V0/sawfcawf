/*:
 * @plugindesc A crafting system for RPG Maker MV that reads crafting recipes from the note fields of items, weapons, and armor.
 * @author ChatGPT
 *
 * @param Craft Menu Name
 * @desc The name of the crafting menu item.
 * @default Craft
 *
 * @help
 * This plugin adds a crafting system to the game. Players can access the crafting menu from the main menu
 * and use materials in their inventory to craft new items.
 * 
 * To define a recipe for crafting, use the following note tag in the items, weapons, or armor:
 *
 * <recipe>
 *   Result: [Item|Weapon|Armor] ID
 *   Material1: [Item|Weapon|Armor] ID, Quantity
 *   Material2: [Item|Weapon|Armor] ID, Quantity
 *   Description: String
 *   Requirement: Item ID
 *   Cost: Quantity
 * </recipe>
 *
 * Example:
 <recipe>
*Result: Item 1
*Material1: Item 8, 1
*Material2: Item 9, 1
*Description: Potion to heal
*Requirement: Item 7
*Cost:50
</recipe>
 */(function() {
    window.Scene_Craft = Scene_Craft;
    var parameters = PluginManager.parameters('CraftingSystem');
    var craftMenuName = String(parameters['Craft Menu Name'] || 'Craft');

    // Add a new "Craft" command in the main menu
    var _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        _Window_MenuCommand_addOriginalCommands.call(this);
        this.addCommand(craftMenuName, 'craft', true);
    };

    // Define the crafting scene
    function Scene_Craft() {
        this.initialize.apply(this, arguments);
    }
    
    Scene_Craft.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Craft.prototype.constructor = Scene_Craft;
    
    Scene_Craft.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };
    
    Scene_Craft.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createCraftWindow();
        this.createDetailsWindow();
    };
    
    Scene_Craft.prototype.createCraftWindow = function() {
        var craftWindowHeight = Graphics.boxHeight - this._helpWindow.height - 350;  // Reserve space for details window
        this._craftWindow = new Window_CraftList(0, this._helpWindow.height, Graphics.boxWidth, craftWindowHeight);
        this._craftWindow.setHandler('ok', this.onCraftOk.bind(this));
        this._craftWindow.setHandler('cancel', this.onCraftCancel.bind(this));
        this._craftWindow.setHandler('select', this.onCraftSelect.bind(this));
        this.addWindow(this._craftWindow);
        this._craftWindow.activate();  // Ensure the window is active for input
        this._craftWindow.select(0);  // Select the first item by default
    };
    
    Scene_Craft.prototype.createDetailsWindow = function() {
        this._detailsWindow = new Window_CraftDetails(0, Graphics.boxHeight - 350, Graphics.boxWidth, 340);
        this.addWindow(this._detailsWindow);
    };
    
    Scene_Craft.prototype.onCraftSelect = function() {
  
    var selectedItem = this._craftWindow.item();
    if (selectedItem && this._detailsWindow) {
        this._detailsWindow.setRecipe(selectedItem);  // Pass selected recipe to details window
    }
};


    
    Scene_Craft.prototype.onCraftOk = function() {
        var recipe = this._craftWindow.item();
        if (recipe && this.canCraft(recipe)) {
            this.doCraft(recipe);
            this._craftWindow.refresh();  // Refresh the window to reflect changes
        } else {
            SoundManager.playBuzzer();
        }
        this._craftWindow.activate();  // Re-activate the window for further input
    };
    
    Scene_Craft.prototype.onCraftCancel = function() {
        this.popScene();  // Exit the scene
    };
    
    Scene_Craft.prototype.getItem = function(type, id) {
        if (type === 'Item') {
            return $dataItems[id];
        } else if (type === 'Weapon') {
            return $dataWeapons[id];
        } else if (type === 'Armor') {
            return $dataArmors[id];
        }
        return null;
    };
    
    Scene_Craft.prototype.canCraft = function(recipe) {
        if (!recipe || !recipe.materials) {
            return false;
        }
    
        // Check if the player has enough of each material
        for (var i = 0; i < recipe.materials.length; i++) {
            var material = recipe.materials[i];
            var item = this.getItem(material.type, material.id);
            console.log(`Checking material: ${material.type} ID: ${material.id} Quantity: ${material.quantity}`);
            console.log(`Available: ${$gameParty.numItems(item)}`);
            // Check if the player has enough of the material
            if ($gameParty.numItems(item) < material.quantity) {
                return false; // Not enough material
            }
        }
    
        // Check if the player has the required item (if any)
        if (recipe.requirement) {
            var requiredItem = this.getItem(recipe.requirement.type, recipe.requirement.id);
            if (!$gameParty.hasItem(requiredItem)) {
                return false;
            }
        }
        if (recipe.cost > 0 && $gameParty.gold() < recipe.cost) {
            return false;
        }
        return true;
    };
    
    
    
    Scene_Craft.prototype.doCraft = function(recipe) {
        if (!recipe || !recipe.materials) {
            console.error("Invalid recipe or missing materials:", recipe);
            return;
        }
        for (var i = 0; i < recipe.materials.length; i++) {
            var material = recipe.materials[i];
            var item = this.getItem(material.type, material.id);
            $gameParty.loseItem(item, material.quantity);
        }
        var resultItem = this.getItem(recipe.result.type, recipe.result.id);
        $gameParty.gainItem(resultItem, 1);
        if (recipe.cost > 0) {
            $gameParty.loseGold(recipe.cost);
        }
        SoundManager.playShop();
    };

    // Define the window for crafting recipes
    function Window_CraftList() {
        this.initialize.apply(this, arguments);
    }

    Window_CraftList.prototype = Object.create(Window_Selectable.prototype);
    Window_CraftList.prototype.constructor = Window_CraftList;

    Window_CraftList.prototype.initialize = function(x, y, width, height) {
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this._rowHeight = this.lineHeight(); // Height of each row
        this._itemsPerRow = 3;
        this._data = [];
        this.refresh();
    };
    
    Window_CraftList.prototype.select = function(index) {
        Window_Selectable.prototype.select.call(this, index);  // Call parent method to handle selection
        if (this._handlers['select']) {
            this.callHandler('select');  // Trigger the 'select' handler when selection changes
        }
    };
    Window_CraftList.prototype.maxRows = function() {
        return Math.ceil(this.maxItems() / this.maxCols()); // Calculate rows based on the number of items and columns
    };
    
    Window_CraftList.prototype.maxCols = function() {
        return this._itemsPerRow;  // Define the number of items per row (3 in your case)
    };
    
    
    Window_CraftList.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
    
        // Ensure correct scrolling when the cursor moves to new rows
        if (this.index() !== this._lastIndex) {
            this._lastIndex = this.index();
            this.ensureCursorVisible();
            this.callUpdateSelect();  // Custom method to call the 'select' handler
        }
    };
    Window_CraftList.prototype.ensureCursorVisible = function() {
        // Make sure the selected item is within the visible window
        var row = Math.floor(this.index() / this.maxCols());
        var visibleRows = this.numVisibleRows();
    
        // Scroll up if the cursor is above the visible window
        if (row < this.topRow()) {
            this.setTopRow(row);
        }
        // Scroll down if the cursor is below the visible window
        if (row > this.bottomRow() - 1) {
            this.setBottomRow(row + 1);
        }
    };
    Window_CraftList.prototype.topRow = function() {
        return Math.floor(this._scrollY / this.itemHeight());
    };
    
    Window_CraftList.prototype.setTopRow = function(row) {
        this._scrollY = row.clamp(0, this.maxTopRow()) * this.itemHeight();
        this.refresh();
    };
    
    Window_CraftList.prototype.bottomRow = function() {
        return this.topRow() + this.numVisibleRows();
    };
    
    Window_CraftList.prototype.setBottomRow = function(row) {
        this.setTopRow(row - this.numVisibleRows());
    };
    
    Window_CraftList.prototype.maxTopRow = function() {
        return Math.max(0, this.maxRows() - this.numVisibleRows());
    };
    Window_CraftList.prototype.isCursorMovable = function() {
        return this.isOpenAndActive();
    };
    
    Window_CraftList.prototype.updateCursor = function() {
        Window_Selectable.prototype.updateCursor.call(this);
    };
    
    Window_CraftList.prototype.callUpdateSelect = function() {
        if (this._handlers['select']) {
            this.callHandler('select');  // Call the select handler
        }
    };
    
    Window_CraftList.prototype.maxItems = function() {
        return this._data ? this._data.length : 0;
    };    

    Window_CraftList.prototype.item = function() {
        return this._data[this.index()];
    };

    Window_CraftList.prototype.refresh = function() {
        this._data = this.loadRecipes();
        this.createContents();
        this.drawAllItems();
    };
    Window_CraftList.prototype.createContents = function() {
        this.contents = new Bitmap(this.contentsWidth(), this.contentsHeight()); // Ensure proper bitmap size
    };
    
    Window_CraftList.prototype.contentsHeight = function() {
        return this.maxItems() * this.itemHeight();
    }
    
   
  
    Window_CraftList.prototype.loadRecipes = function() {
        var recipes = [];
        $dataItems.concat($dataWeapons, $dataArmors).forEach(function(item) {
            if (item && item.note) {
                var recipe = this.parseRecipe(item.note);
                if (recipe && this.canDisplayRecipe(recipe)) {
                    recipes.push(recipe);
                }
            }
        }, this);
        return recipes;
    };
    Window_CraftList.prototype.canDisplayRecipe = function(recipe) {
        if (recipe.requirement) {
            var requiredItem = this.getItemById(recipe.requirement.type, recipe.requirement.id);
            return $gameParty.hasItem(requiredItem); // Check if the player has the required item
        }
        return true; // Display recipes without requirements
    };
    
    Scene_Craft.prototype.hasItem = function(item) {
        return $gameParty.hasItem(item); // Check if the party has the item
    };
    
    Window_CraftList.prototype.getItemById = function(type, id) {
        if (type === 'Item') {
            return $dataItems[id];
        } else if (type === 'Weapon') {
            return $dataWeapons[id];
        } else if (type === 'Armor') {
            return $dataArmors[id];
        }
        return null;
    };
    

    Window_CraftList.prototype.parseRecipe = function(note) {
        var recipe = null;
        var regex = /<recipe>\s*Result:\s*(Item|Weapon|Armor)\s*(\d+)\s*[\s\S]*?Material1:\s*(Item|Weapon|Armor)\s*(\d+),\s*(\d+)\s*[\s\S]*?Material2:\s*(Item|Weapon|Armor)\s*(\d+),\s*(\d+)\s*[\s\S]*?Description:\s*(.*?)\s*(?:Requirement:\s*(Item|Weapon|Armor)\s*(\d+))?\s*(?:Cost:\s*(\d+))?\s*<\/recipe>/i;
        var match = regex.exec(note);
    
        if (match) {
            recipe = {
                result: { type: match[1], id: Number(match[2]) },
                materials: [
                    { type: match[3], id: Number(match[4]), quantity: Number(match[5]) },
                    { type: match[6], id: Number(match[7]), quantity: Number(match[8]) }
                ],
                description: match[9] || "",  // Handle missing description
                requirement: match[10] ? { type: match[10], id: Number(match[11]) } : null, // Handle optional requirement
                cost: match[12] ? Number(match[12]) : 0 // Handle optional cost
            };
        }
    
        return recipe;
    };
    

    Window_CraftList.prototype.drawAllItems = function() {
        var topIndex = this.topIndex(); // Get the first visible item index
        var bottomIndex = Math.min(this.maxItems(), topIndex + this.numVisibleRows() * this.maxCols()); // Get the last visible item index
    
        for (var i = topIndex; i < bottomIndex; i++) {
            this.drawItem(i); // Only draw visible items
        }
    };
    
    
   Window_CraftList.prototype.drawItem = function(index) {
    var rect = this.itemRect(index);
    if (rect.y + rect.height > 0 && rect.y < this.height) { // Ensure items are drawn only when within the visible area
        var recipe = this._data[index];
        if (recipe) {
            var iconIndex = this.getItemIconIndex(recipe.result.type, recipe.result.id);
            var itemName = this.getItemName(recipe.result.type, recipe.result.id);
            this.drawIcon(iconIndex, rect.x + 2, rect.y + 2);
            this.drawText(itemName, rect.x + Window_Base._iconWidth + 4, rect.y, rect.width - Window_Base._iconWidth - 4, 'left');
        }
    }
};


Window_CraftList.prototype.cursorDown = function(wrap) {
    if (this.index() < this.maxItems() - 1 || wrap) {
        this.select((this.index() + this.maxCols()) % this.maxItems());
    }
};

Window_CraftList.prototype.cursorUp = function(wrap) {
    if (this.index() > 0 || wrap) {
        this.select((this.index() - this.maxCols() + this.maxItems()) % this.maxItems());
    }
};
Window_CraftList.prototype.itemHeight = function() {
    // Set the height of each item in the list (the row height)
    return this.lineHeight();
};
Window_CraftList.prototype.cursorPagedown = function() {
    this.smoothScrollBy(this.maxPageRows());
};
Window_CraftList.prototype.maxPageRows = function() {
    // Define how many rows can be displayed per page for pagination
    return this.numVisibleRows();
};
Window_CraftList.prototype.cursorPageup = function() {
    this.smoothScrollBy(-this.maxPageRows());
};
Window_CraftList.prototype.numVisibleRows = function() {
    // Calculate how many rows can be visible based on the window's height and row height
    return Math.floor(this.height / this.itemHeight());
};
    
   
Window_CraftList.prototype.itemRect = function(index) {
    var rect = new Rectangle();
    var row = Math.floor(index / this.maxCols()); // Calculate row based on index
    var col = index % this.maxCols(); // Calculate column based on index

    rect.x = col * (this.contentsWidth() / this.maxCols()); // X position
    rect.y = row * this.itemHeight() - this._scrollY; // Y position with scroll offset
    rect.width = this.contentsWidth() / this.maxCols(); // Width for each item
    rect.height = this.itemHeight(); // Height for each item

    return rect;
};
  

    Window_CraftList.prototype.getItemIconIndex = function(type, id) {
        var item = SceneManager._scene.getItem(type, id);
        return item ? item.iconIndex : 0;  // Default to icon index 0 if item is not found
    };

    Window_CraftList.prototype.getItemName = function(type, id) {
        var item = SceneManager._scene.getItem(type, id);
        return item ? item.name : "Unknown Item";
    };

    // Define the window for displaying recipe details
    function Window_CraftDetails() {
        this.initialize.apply(this, arguments);
    }

    Window_CraftDetails.prototype = Object.create(Window_Base.prototype);
    Window_CraftDetails.prototype.constructor = Window_CraftDetails;

    Window_CraftDetails.prototype.initialize = function(x, y, width, height) {
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this._recipe = null;
        this.refresh();
    };

    Window_CraftDetails.prototype.setRecipe = function(recipe) {
        this._recipe = recipe;
        this.refresh();
    };
    

    Window_CraftDetails.prototype.refresh = function() {
        this.contents.clear();
        if (this._recipe) {
            var y = 0;
            var lineHeight = this.lineHeight();
            
            // Draw description
            this.drawText("Description:", 0, y, this.contents.width);
            y += lineHeight;
            this.drawText(this._recipe.description, 0, y, this.contents.width);
            y += lineHeight + 1;
    // Draw weapon or armor parameters if applicable
    var resultItem = this.getItem(this._recipe.result.type, this._recipe.result.id);
    var paramWidth = this.contents.width / 6;
    var x =0;
    
    if (resultItem && (resultItem.atk !== undefined || resultItem.def !== undefined)) {
   
            this.drawText(`Attack: ${resultItem.atk}`, x, y, this.contents.width);
            x += paramWidth;
            this.drawText(`  Defense: ${resultItem.def}`, x, y, this.contents.width);
            x += paramWidth;
            this.drawText(`    Agility: ${resultItem.agi}`, x, y, this.contents.width);
            x += paramWidth;
            
            y += lineHeight;
            x=0;
            this.drawText(`M.Attack: ${resultItem.mat}`, x, y, this.contents.width);
            x += paramWidth;
            this.drawText(`  M.Defesnse: ${resultItem.mdf}`, x, y, this.contents.width);
            x += paramWidth;


            this.drawText(`    Luck: ${resultItem.luk}`, x, y, this.contents.width);
            x += paramWidth;

        y += lineHeight;

        // Add more parameters as needed
    }
            // Draw cost if applicable
            if (this._recipe.cost > 0) {
                this.drawText(`Cost: ${this._recipe.cost} Fairy Mass`, 0, y, this.contents.width);
                y += lineHeight;
            }
           
            // Draw materials
            this.drawText("Materials:", 0, y, this.contents.width);
            y += lineHeight;
            this._recipe.materials.forEach(function(material, i) {
                var materialItem = this.getItemName(material.type, material.id);
                var iconIndex = this.getItemIconIndex(material.type, material.id);
                this.drawIcon(iconIndex, 0, y);
                this.drawText(`  Material ${i + 1}: ${materialItem} x${material.quantity}`, 24, y, this.contents.width - 24);
                y += lineHeight;
            }, this);
            
            
            
        }
    };
    Window_CraftDetails.prototype.getItem = function(type, id) {
        let item = null;
    
        if (type === 'Item') {
            item = $dataItems[id];
            // Return only basic information for regular items
            return {
                name: item.name,
                description: item.description,
                iconIndex: item.iconIndex
            };
        } else if (type === 'Weapon') {
            item = $dataWeapons[id];
        } else if (type === 'Armor') {
            item = $dataArmors[id];
        }
    
        // Ensure item exists for weapons and armors and return their parameters
        if (item) {
            return {
                name: item.name,
                description: item.description,
                iconIndex: item.iconIndex,
                atk: item.params[2] || 0, // Attack
                def: item.params[3] || 0, // Defense
                mat: item.params[4] || 0, // Magic Attack
                mdf: item.params[5] || 0, // Magic Defense
                agi: item.params[6] || 0, // Agility
                luk: item.params[7] || 0  // Luck
                // Add more parameters as needed based on RPG Maker MV's item structure
            };
        }
    
        return null;
    };
    
    


    Window_CraftDetails.prototype.getItemIconIndex = function(type, id) {
        var item = SceneManager._scene.getItem(type, id);
        return item ? item.iconIndex : 0;  // Default to icon index 0 if item is not found
    };

    Window_CraftDetails.prototype.getItemName = function(type, id) {
        var item;
        if (type === 'Item') {
            item = $dataItems[id];
        } else if (type === 'Weapon') {
            item = $dataWeapons[id];
        } else if (type === 'Armor') {
            item = $dataArmors[id];
        }
        return item ? item.name : "Unknown Item";
    };

    // Add the crafting scene to the main menu
    var _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        _Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler('craft', this.commandCraft.bind(this));
    };

    Scene_Menu.prototype.commandCraft = function() {
        SceneManager.push(Scene_Craft);
    };
})();
