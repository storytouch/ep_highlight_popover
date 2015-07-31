describe("Popover", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(function() {
      ensureFistLineHasContent('First Line of Pad', cb);
    });
    this.timeout(60000);
  });

  it("Displays popover when text is selected", function(done) {
    var outer$ = helper.padOuter$;
    var $popover = outer$("#popover");

    selectText();

    // wait for popover to be displayed
    helper.waitFor(function() {
      return $popover.is(':visible');
    })
    .done(done);
  });

  it("Opens new comment form when text is selected and Add Comment button is clicked on the popover", function(done) {
    var outer$ = helper.padOuter$;
    var $popover = outer$("#popover");

    selectText();

    // wait for popover to be displayed
    helper.waitFor(function() {
      return $popover.is(':visible');
    })
    .done(function() {
      var $addCommentButton = $popover.find('.addComment');
      $addCommentButton.click();

      var commentFormIsDisplayed = outer$('#newComments.active').length === 1;
      expect(commentFormIsDisplayed).to.be(true);
      done();
    });
  });

});

function ensureFistLineHasContent(targetText, cb) {
  var inner$ = helper.padInner$;

  // get the first text element out of the inner iframe
  var $firstTextElement = inner$("div").first();

  // simulate key presses to delete content
  $firstTextElement.sendkeys('{selectall}'); // select all
  $firstTextElement.sendkeys('{del}'); // clear the first line
  $firstTextElement.sendkeys(targetText); // insert text

  cb();
}

function selectText() {
  var inner$ = helper.padInner$;

  // get the first text element out of the inner iframe
  var $firstTextElement = inner$("div").first();

  // simulate key presses to delete content
  $firstTextElement.sendkeys('{selectall}'); // select all
}
