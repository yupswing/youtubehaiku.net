$(function() {

  // Similar to jQuery UI .highlight()
  jQuery.fn.flash = function(or_color, bg_color, duration) {
    var element = this;
    var bg_current = or_color || element.css('backgroundColor');
    element.stop(true).animate({
      'backgroundColor': 'rgb(' + bg_color + ')'
    }, duration / 2, function() {
      element.stop(true).animate({
        'backgroundColor': 'rgb(' + bg_current + ')'
      }, duration / 2);
    });
  };

});
