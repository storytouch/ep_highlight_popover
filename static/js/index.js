var cssFiles = [
  'ep_etherpad-lite/static/css/pad.css', // for styling all buttons
  'ep_comments_page/static/css/main.css', // for the icon of "Add Comment" button
  'ep_highlight_popover/static/css/popover.css'
];

// Easier access to outer pad
var padOuter;
var getPadOuter = function() {
  padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
  return padOuter;
}

// Easier access to inner pad
var padInner;
var getPadInner = function() {
  padInner = padInner || getPadOuter().find('iframe[name="ace_inner"]');
  return padInner;
}

// Easier access to popover
var popover;
var getPopover = function() {
  popover = popover || getPadOuter().find("#popover");
  return popover;
}

// Indicates if user selected some text on editor
var checkNoTextSelected = function() {
  var noTextSelected = true;

  var padInnerWindow = getPadInner().get(0).contentWindow;
  if (padInnerWindow.getSelection) { // won't work before IE9
    var selectedText = padInnerWindow.getSelection();
    noTextSelected = selectedText.toString().length === 0;
  }

  return noTextSelected;
}

// Localize popover when language is changed on the editor
var listenToLanguageChange = function() {
  html10n.bind('localized', function() {
    localizePopover();
  });
}

var localizePopover = function() {
  html10n.translateElement(html10n.translations, getPopover().get(0));
}

var listenToWindowResize = function() {
  // When screen size changes (user changes device orientation, for example),
  // we need to make sure popover is on the correct place
  waitForResizeToFinishThenCall(function() {
    editorResized();
  });

  // When Page View is enabled/disabled, we need to recalculate position of popover
  $('#options-pageview').on('click', function(e) {
    editorResized();
  });
  // When Page Breaks are enabled/disabled, we need to recalculate position of popover
  $('#options-pagebreaks').on('click', function(e) {
    editorResized();
  });

}

// Some browsers trigger resize several times while resizing the window, so
// we need to make sure resize is done to avoid calling the callback multiple
// times.
// Based on: https://css-tricks.com/snippets/jquery/done-resizing-event/
var waitForResizeToFinishThenCall = function(callback){
  var resizeTimer;
  $(window).on("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(callback, 200);
  });
}

// Make the adjustments after editor is resized (due to a window resize or
// enabling/disabling Page View)
var editorResized = function() {

  // We try increasing timeouts, to make sure user gets the response as fast as we can
  setTimeout(function() {
    displayPopoverOnCorrectPosition();
    setTimeout(function() {
      displayPopoverOnCorrectPosition();
      setTimeout(function() {
        displayPopoverOnCorrectPosition();
      }, 1000);
    }, 500);
  }, 250);
}

var createPopover = function() {
  getPadOuter().find("body").append("<div id='popover' class='toolbar'><ul></ul></div>");
  addCommandsToPopover();

  // Add listeners to trigger actions on popover buttons
  createActionsOnButtons();

  // When language is changed, we need to localize command tooltips
  listenToLanguageChange();

  // When windows is resized, we need to update popover position
  listenToWindowResize();
}

var addCommandsToPopover = function() {
  $("li.addComment").clone().appendTo(getPadOuter().find("#popover ul"));
}

var createActionsOnButtons = function() {
  // Add Comment button
  getPopover().on('click', '.addComment', function(e) {
    $('.addComment').click();
  });
}

var displayPopoverOnCorrectPosition = function() {
  var cssProperties = getPopoverBeforeCssProperties();
  var popoverPosition = getPopoverPosition(cssProperties);

  if (popoverPosition) {
    // Adjust popover position and show it
    getPopover().css({
      left: popoverPosition.left,
      top: popoverPosition.top
    }).show();

    // If popover is outside of viewport area, scroll a little bit
    scrollViewportIfPopoverIsNotVisible(cssProperties);
  }
}

// Retrieves an object with some CSS properties of #popover:before
// Based on http://davidwalsh.name/pseudo-element
var getPopoverBeforeCssProperties = function() {
  var padOuterWindow = $('iframe[name="ace_outer"]').get(0).contentWindow;
  var padOuterDocument = padOuterWindow.document;
  var beforeProperties = padOuterWindow.getComputedStyle(padOuterDocument.querySelector('#popover'), ':before');

  var cssLeft   = parseInt(beforeProperties.getPropertyValue('left'));
  var cssBorder = parseInt(beforeProperties.getPropertyValue('border-right-width'));
  var cssTop    = parseInt(beforeProperties.getPropertyValue('top'));

  return { left: cssLeft, border: cssBorder, top: cssTop };
}

var getPopoverPosition = function(cssProperties) {
  var popoverPosition = null;
  var targetPosition = firstSelectedCharPosition();

  if (targetPosition) {
    var positionOfMiddleOfPopoverTriangle = cssProperties.left + 1.5* cssProperties.border;
    var padInnerOffset = getPadInner().offset();

    var top  = padInnerOffset.top + targetPosition.bottom + 4; // +4: adding some padding
    var left = padInnerOffset.left + targetPosition.left - positionOfMiddleOfPopoverTriangle;

    popoverPosition = { top: top+"px", left: left+"px"};
  }

  return popoverPosition;
}

var firstSelectedCharPosition = function() {
  var position = null;
  // Insert dummy <span> just to get the correct positioning for the popover, then remove it
  var padInnerWindow = getPadInner().get(0).contentWindow;
  if (padInnerWindow.getSelection) { // won't work before IE9
    var selectedText = padInnerWindow.getSelection();
    var dummy = getOrCreateDummySpan();

    newRange = $('iframe[name="ace_outer"]').get(0).ownerDocument.createRange();

    var offset = selectedText.focusOffset;
    var target = selectedText.focusNode;
    if (isSelectionBackwards(selectedText)) {
      // Backwards selection puts popover on the last char before selection first char,
      // so we need an adjustment
      offset++;
    } else if (offset === 0) {
      // If selection ends on the end of an ace-line, popover might be placed on a weird
      // position, so we need an adjustment
      target = lastTextNodeOfPreviousLine(target);
      offset = target.length;
    }

    newRange.setStart(target, offset);
    newRange.insertNode(dummy.get(0));
    position = dummy.get(0).getBoundingClientRect();
    dummy.remove();
  }

  return position;
}

var getOrCreateDummySpan = function() {
  var dummy = getPadOuter().find('#popover-target');

  // create dummy <span> if does not exist
  if (dummy.length === 0) {
    getPadOuter().find("body").append("<span id='popover-target'></span>");
    dummy = getPadOuter().find('#popover-target');
  }

  return dummy;
}

// Based on http://stackoverflow.com/a/8039026
var isSelectionBackwards = function(selection) {
  var backwards = false;
  if (!selection.isCollapsed) {
      var range = getPadInner().get(0).ownerDocument.createRange();
      range.setStart(selection.anchorNode, selection.anchorOffset);
      range.setEnd(selection.focusNode, selection.focusOffset);
      backwards = range.collapsed;
  }
  return backwards;
}

// Gets the last text node on the ace-line before the line where rootElement is
var lastTextNodeOfPreviousLine = function(rootElement) {
  var lineWithRootElement = $(rootElement).closest("#innerdocbody > div");
  var previousLine = lineWithRootElement.prev();

  return lastTextNodeOf(previousLine.get(0));
}

// Gets the last text node of the rootElement
var lastTextNodeOf = function(rootElement) {
  var lastTextNode = null;
  var children = $(rootElement).contents();

  // if root is a leaf (has no children), we return it itself if it is a text node
  if (children.length === 0) {
    if (rootElement.nodeType === Node.TEXT_NODE) return rootElement;
    return null;
  }

  // otherwise we iterate its children from last to first
  $(children.get().reverse()).each(function() {
    var textNode = lastTextNodeOf(this);

    if (textNode) {
      lastTextNode = textNode;
      return false; // to break the loop
    }
  });

  return lastTextNode;
}

var scrollViewportIfPopoverIsNotVisible = function(cssProperties) {
  var popoverRect = getPopover().get(0).getBoundingClientRect();
  var popoverIsNotVisible = popoverRect.bottom > $('iframe[name="ace_outer"]').height();

  if (popoverIsNotVisible) {
    var target = getPadOuter().find('#outerdocbody');
    var shiftScrollTop = getPopover().outerHeight() - cssProperties.top;

    target.scrollTop(target.scrollTop() + shiftScrollTop); // Works in Chrome
    target.parent().scrollTop(target.parent().scrollTop() + shiftScrollTop); // Works in Firefox
  }
}

// 'selectionchange' is triggered several times while user is changing selected text,
// so we need to make sure user is done to avoid calling the callback multiple times.
var waitForSelectionChangeToFinishThenCall = function(callback) {
  var selectionChangeTimer;
  getPadInner().contents().on('selectionchange', function(e) {
    clearTimeout(selectionChangeTimer);
    selectionChangeTimer = setTimeout(callback, 400); // timeout cannot be too soon otherwise the click on the button will happen after selection is lost
  });
}

var updatePopover = function() {
  // If we don't have a selection then we hide command options
  var noTextSelected = checkNoTextSelected();
  if (noTextSelected) {
    getPopover().hide();
    return;
  }

  displayPopoverOnCorrectPosition();
}

/* ***** Public methods: ***** */

exports.aceEditorCSS = function(){
  return cssFiles;
};

// Create popover and bind events to show/hide it
exports.postAceInit = function(hook, context){
  // Create popover container
  createPopover();

  waitForSelectionChangeToFinishThenCall(function() {
    updatePopover();
  });

  // Any event that might trigger a selection change on the editor
  getPadInner().contents().on('mouseup touchend keydown', function(e) {
    // use timeout to leave some time for text selection to be updated
    setTimeout(function() {
      updatePopover();
    }, 0);
  });
};

