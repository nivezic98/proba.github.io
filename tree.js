"use strict";

var treetableModule = (function()
{
  var that = {};

  var expandSymbol = "\u25B8"; // triangle right unicode
  var collapseSymbol = "\u25BE"; // triangle down unicode

  var EXPANDED_RE = /\bexpanded\b/;
  var COLLAPSED_RE = /\bcollapsed\b/;

  var isExpanded = function(element) {
    var expanded = EXPANDED_RE.test(element.className);
    var collapsed = COLLAPSED_RE.test(element.className);
    return expanded ? true : collapsed ? false : undefined;
  };

  var setExpanded = function(row, expand, treeCellColumn, expandSymbol, collapseSymbol) {
    var expandControl = row.children[treeCellColumn].children[0];
    if (expand === true) { // expand folder
      row.className = row.className.replace(COLLAPSED_RE, "");
      row.className += " expanded";
      expandControl.innerHTML = collapseSymbol;
    }
    else if (expand === false) { // collapse folder
      row.className = row.className.replace(EXPANDED_RE, "");
      row.className += " collapsed";
      expandControl.innerHTML = expandSymbol;
    }
    else { // leaf item
      row.className = row.className.replace(EXPANDED_RE, "");
      row.className = row.className.replace(COLLAPSED_RE, "");
      expandControl.innerHTML = "";
    }
  };

  var getLevel = function(row) {
    return parseInt(row.getAttribute("data-tree-level"), 10);
  };

  var isBelowExpandedParent = function(baseLevel, childLevel, parents, precedingItem) {
    var levelChange = childLevel - baseLevel - parents.length - 1;
    if (levelChange < 0)
      for (var i = 0; i > levelChange; i--)
        parents.pop();
    else if (levelChange === 1)
      parents.push(precedingItem);
    else if (levelChange > 1)
      throw "Treetable items are not in a depth-first order!";

    for (var i = 0; i < parents.length; i++)
      if ( ! isExpanded(parents[i]) )
        return false;

    return true;
  };

  var findSubTree = function(row, onCollapse) {
    var baseLevel = getLevel(row);
    var parent = row.parentElement;
    var collection = [];
    var inSubTree = false;
    var parents = [];
    var precedingItem;

    for (var i = 0; i < parent.children.length; i++) {
      var child = parent.children[i];
      if (child === row) { // before start of sub-tree
        inSubTree = true;
      }
      else if (inSubTree) {
        var childLevel = getLevel(child);
        if (childLevel > baseLevel) { // in sub-tree
          // on collapse all children are collected, recursively,
          // on expand only direct children or items below expanded parents,
          // not items below collapsed parents
          if (onCollapse ||
              childLevel === baseLevel + 1 ||
              isBelowExpandedParent(baseLevel, childLevel, parents, precedingItem))
            collection.push(child);

          precedingItem = child;
        }
        else { // end of sub-tree
          inSubTree = false;
        }
      }
    }
    return collection;
  };

  var toggleExpansion = function(row, isExpanded, treeCellColumn, expandSymbol, collapseSymbol) {
    if ( ! expandSymbol || ! collapseSymbol )
      throw "Lost symbols!";

    var subTree = findSubTree(row, isExpanded);
    for (var i = 0; i < subTree.length; i++)
      subTree[i].style.display = isExpanded ? "none" : "";

    if (subTree.length > 0)
      setExpanded(row, ! isExpanded, treeCellColumn, expandSymbol, collapseSymbol);
  };

  var addListener = function(expandControl, row, treeCellColumn, expandSymbol, collapseSymbol) {
    expandControl.addEventListener("click", function() {
      toggleExpansion(row, isExpanded(row), treeCellColumn, expandSymbol, collapseSymbol);
    });
  };

  var invisiblyInitializeAndConfigureTable = function(
      treetable,
      treeCellColumn,
      initiallyExpanded)
  {
    var rows = treetable.getElementsByTagName("TR");
    var foundTreeCell = false;
    
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var treeCell = row.children[treeCellColumn];

      if (treeCell) { // could contain no cells at all
        foundTreeCell = true;
        var level = getLevel(row);
        var expandControl = document.createElement("span");
        expandControl.style.cssText =
            "display: inline-block; "+ // force browser to respect width
            "width: 1em; "+
            "margin-left: "+level+"em; "+ // tree level indentation in "m"
            "margin-right: 0.2em; "+
            "cursor: pointer;";
        treeCell.insertBefore(expandControl, treeCell.childNodes[0]);

        toggleExpansion(row, initiallyExpanded, treeCellColumn, expandSymbol, collapseSymbol);

        addListener(expandControl, row, treeCellColumn, expandSymbol, collapseSymbol);
      }
    }
    return foundTreeCell ? rows : undefined;
  };

  var initializeAndConfigureTable = function(treetable, initiallyExpanded, treeCellColumn) {
    treeCellColumn = (treeCellColumn && treeCellColumn >= 0) ? treeCellColumn : 0;
    initiallyExpanded = (initiallyExpanded !== undefined) ? initiallyExpanded : false;

    treetable.style.visibility = "hidden"; // hide table until it is ready

    var rows = invisiblyInitializeAndConfigureTable(
        treetable,
        treeCellColumn,
        false); // to find out column widths, expand all initially

    if ( ! rows )
      throw "Found not a single tree cell at column index (0-n): "+treeCellColumn;

    var treeColumnWidth = rows[0].children[treeCellColumn].clientWidth;

    if ( ! initiallyExpanded ) // set the initial collapsed state
      for (var i = 0; i < rows.length; i++)
        toggleExpansion(rows[i], ! initiallyExpanded, treeCellColumn, expandSymbol, collapseSymbol);

    for (var i = 0; i < rows.length; i++)
      rows[i].children[treeCellColumn].style.width = treeColumnWidth+"px";

    treetable.style.visibility = "visible"; // show table
  };

  var initializeTable = function(treetable) {
    var treeCellColumnString = treetable.getAttribute("data-tree-column");
    var treeCellColumn = treeCellColumnString ? parseInt(treeCellColumnString, 10) : 0;
    var initiallyExpanded = treetable.getAttribute("data-tree-expanded") === "true";
    initializeAndConfigureTable(treetable, initiallyExpanded, treeCellColumn);
  };

  var initializeTables = function(treetables) {
    for (var i = 0; i < treetables.length; i++)
      initializeTable(treetables[i]);
  };

  var getClassTreetables = function() {
    return document.getElementsByClassName("treetable");
  };

  var initializeClassTreetables = function() {
    initializeTables(getClassTreetables());
  };

  var setExpandSymbols = function(expandSym, collapseSym) {
    if (expandSym)
      expandSymbol = expandSym; 
    if (collapseSym)
      collapseSymbol = collapseSym; 
  };

  that.initializeClassTreetables = initializeClassTreetables;
  that.initializeTables = initializeTables;
  that.initializeTable = initializeTable;
  that.initializeAndConfigureTable = initializeAndConfigureTable;
  that.getClassTreetables = getClassTreetables;
  that.setExpandSymbols = setExpandSymbols;

  return that;

}());