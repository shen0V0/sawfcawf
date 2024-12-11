/*:
 * 1.Make an target unselectable with state that have <SP variable>nontargetable</SP variable> tag in the note box.
 * @param Targetable State Tag
 * @desc The tag used in the state note box to make enemies unselectable (e.g., <SP variable>nontargetable</SP variable>).
 * @type string
 * @default 
 * <SP variable>
 * nontargetable
 * </SP variable>
 */


(
    function() {
    var parameters = PluginManager.parameters('UnselectableState');
    var targetableTag = String(parameters['Targetable State Tag'] || '<SP variable>nontargetable</SP variable>');

     
    Game_Enemy.prototype.isSelectable = function() {
        
        for (var i = 0; i < this._states.length; i++) {
            var stateId = this._states[i];
            var state = $dataStates[stateId];
            if (state && state.note.includes(targetableTag)) {


                return false;  
            }
        }
        
        return true;  
    };

     var _Window_BattleEnemy_isCursorMovable = Window_BattleEnemy.prototype.isCursorMovable;
    Window_BattleEnemy.prototype.isCursorMovable = function() {
        var original = _Window_BattleEnemy_isCursorMovable.call(this);
        if (!original) return false;

         var selectableEnemies = $gameTroop.aliveMembers().filter(function(enemy) {
            var selectable = enemy.isSelectable();
            return selectable;
        });

        this._enemies = selectableEnemies; 
        return true;
    };
})();
