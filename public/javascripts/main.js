$(window, document, undefined).ready(function() {

  $('input').blur(function() {
    var $this = $(this);
    if ($this.val())
      $this.addClass('used');
    else
      $this.removeClass('used');
  });
  
  var $ripples = $('.ripples');

  $ripples.on('click.Ripples', function(e) {

    var $this = $(this);
    var $offset = $this.parent().offset();
    var $circle = $this.find('.ripplesCircle');

    var x = e.pageX - $offset.left;
    var y = e.pageY - $offset.top;

    $circle.css({
      top: y + 'px',
      left: x + 'px'
    });

    $this.addClass('is-active');

  });

  $ripples.on('animationend webkitAnimationEnd mozAnimationEnd oanimationend MSAnimationEnd', function(e) {
  	$(this).removeClass('is-active');
  });

  $.get( "/universityList", function( data ) {
    $( "#universityInput" ).autocomplete({
      source: data
    });

   /* $('.timer').each(count);
    function count(options) {
      var $this = $(this);
      //options = $.extend({}, options || {}, $this.data('countToOptions') || {});
      $this.countTo();
  }*/
  

  });

  // $("#login_page button.login_button").click(function(){
  //   var username = $("#login_page input#username").val();
  //   var password = $("#login_page input#password").val();
  //   var data = {
  //     "username" : username,
  //     "password" : password
  //   };
  //   $.post( "/login", data, function(res){
  //     if(res == 1) {
  //       alert("Login Successful");
  //     } else {
  //       alert("Failed. Please try again!");
  //     }
  //   });
    
  // });

  // $("#register_page button.register_button").click(function(){
  //   var password = $("#register_page input#passwordInput").val();
  //   var passwordConfirm = $("#register_page input#reconfirmInput").val();
  //   if(passwordConfirm != password){
  //     $("#register_page .err").html("Passwords do not match. Try again!");
  //   } else {
  //     var username = $("#register_page input#usernameInput").val();
  //     var firstName = $("#register_page input#firstName").val();
  //     var lastName = $("#register_page input#lastName").val();
  //     var universityInput = $("#register_page input#universityInput").val();
  //     var departmentInput = $("#register_page input#departmentInput").val();
  //     var emailInput = $("#register_page input#emailInput").val();

  //     var data = {
  //       "username" : username,
  //       "firstName" : firstName,
  //       "lastName" : lastName,
  //       "university" : usernameInput,
  //       "department" : departmentInput,
  //       "email" : emailInput,
  //       "password" : password
  //     };

  //     $.post( "/register", data, function(res){
  //       if(res == 1) {
  //         alert("Registration Successful");
  //       } else {
  //         alert("Failed. Please try again!");
  //       }
  //     });
  //   } 

    
  // });

});