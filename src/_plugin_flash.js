$(function () {
  // * Extend every element with a .flash() function
  // * that mimics the jQueryUI .highlight() function
  // source: http://stackoverflow.com/questions/275931/how-do-you-make-an-element-flash-in-jquery

  // Similar to jQuery UI .highlight()
  jQuery.fn.flash = function (or_color, bg_color, duration) {
    var element = this;
    var bg_current = or_color || element.css("backgroundColor");
    element.stop(true).animate(
      {
        backgroundColor: "rgb(" + bg_color + ")",
      },
      duration / 2,
      function () {
        element.stop(true).animate(
          {
            backgroundColor: "rgb(" + bg_current + ")",
          },
          duration / 2
        );
      }
    );
  };
});
