/*
 * responsive-carousel
 * https://github.com/filamentgroup/responsive-carousel
 *
 * Copyright (c) 2012 Filament Group, Inc.
 * Licensed under the MIT, GPL licenses.
 */

(function($) {

	var pluginName = "carousel",
		initSelector = "." + pluginName,
		transitionAttr = "data-transition",
		prevAttr = "data-prev",
		prevTitleAttr = "data-prev-title",
		nextAttr = "data-next",
		nextTitleAttr = "data-next-title",
		transitioningClass = pluginName + "-transitioning",
		itemClass = pluginName + "-item",
		activeClass = pluginName + "-active",
		prevClass = pluginName + "-item-prev",
		nextClass = pluginName + "-item-next",
		inClass = pluginName + "-in",
		outClass = pluginName + "-out",
		navClass =  pluginName + "-nav",
		focusables = "a, input, button, select, [tabindex], textarea",
		prototype,
		cssTransitionsSupport = (function(){
			var prefixes = "webkit Moz O Ms".split( " " ),
				supported = false,
				property;

			prefixes.push("");

			while( prefixes.length ){
				property = prefixes.shift();
				property += (property === "" ? "t" : "T" )+ "ransition";

				if ( property in document.documentElement.style !== undefined && property in document.documentElement.style !== false ) {
					supported = true;
					break;
				}
			}
			return supported;
		}()),
		methods = {
			_create: function(){
				$( this )
					.trigger( "beforecreate." + pluginName )
					[ pluginName ]( "_init" )
					[ pluginName ]( "_addNextPrev" )
					.trigger( "create." + pluginName );
			},

			_init: function(){
				var trans = $( this ).attr( transitionAttr );

				if( !trans ){
					cssTransitionsSupport = false;
				}

				$( this )
					.addClass(
						pluginName +
						" " + ( trans ? pluginName + "-" + trans : "" ) + " "
					)
					.attr( "role", "region" )
					.attr( "aria-label", "carousel" )
					.children()
					.addClass( itemClass );

				$(this)[ pluginName ]( "_addNextPrevClasses" );
				$(this)[ pluginName ]( "update" );
				$( this ).data( pluginName + "data", "init"  );
			},

			_addNextPrevClasses: function(){
				var $items = $( this ).find( "." + itemClass ),
					$active = $items.filter( "." + activeClass ),
					$next = $active.next().filter( "." + itemClass ),
					$prev = $active.prev().filter( "." + itemClass );

				if( !$next.length ){
					$next = $items.first().not( "." + activeClass );
				}
				if( !$prev.length ){
					$prev = $items.last().not( "." + activeClass );
				}

				$items.removeClass( prevClass + " " + nextClass );
				$prev.addClass( prevClass );
				$next.addClass( nextClass );

			},

			next: function(){
				$( this )[ pluginName ]( "goTo", "+1" );
			},

			prev: function(){
				$( this )[ pluginName ]( "goTo", "-1" );
			},

			goTo: function( num ){
				if( this.isNavDisabled ){
					return;
				}

				// disable navigation when moving from slide to slide
				// enabled in `_transitionEnd`
				this.isNavDisabled = true;
				var $self = $(this),
					trans = $self.attr( transitionAttr ),
					reverseClass = " " + pluginName + "-" + trans + "-reverse";

				// clean up children
				$( this ).find( "." + itemClass ).removeClass( [ outClass, inClass, reverseClass ].join( " " ) );

				var $from = $( this ).find( "." + activeClass ),
					prevs = $from.index(),
					activeNum = ( prevs < 0 ? 0 : prevs ) + 1,
					nextNum = typeof( num ) === "number" ? num : activeNum + parseFloat(num),
					carouselItems = $( this ).find( "." + itemClass ),
					index = (nextNum - 1) % carouselItems.length,
					beforeGoto = "beforegoto." + pluginName,
					$to = carouselItems.eq( index ),
					reverse = ( typeof( num ) === "string" && !(parseFloat(num)) ) || nextNum > activeNum ? "" : reverseClass,
					data;

				$self.trigger( beforeGoto, data = {
					$from: $from,
					$to: $to,
					direction: nextNum > activeNum ? "forward" : "backward"
				});


				// NOTE this is a quick hack to approximate the api that jQuery provides
				//      without depending on the API (for use with similarly shaped apis)
				if( data.isDefaultPrevented ) {
					return;
				}

				if( !$to.length ){
					$to = $( this ).find( "." + itemClass )[ reverse.length ? "last" : "first" ]();
				}

				// added to allow pagination to track
				$self.trigger( "goto." + pluginName, [ $to, index ] );

				if( cssTransitionsSupport ){
					$self[ pluginName ]( "_transitionStart", $from, $to, reverse, index );
				} else {
					$self[ pluginName ]( "_transitionEnd", $from, $to, reverse, index );
					$self[ pluginName ]( "_postTransitionCleanup", $from, $to, index );
				}
			},

			update: function(){
				var $items = $(this).children().not( "." + navClass );
				var $activeItem = $items.filter( "." + activeClass );
				if( !$activeItem.length ){
					$activeItem = $items.first();
				}

				$items
					.addClass( itemClass )
					.attr( "tabindex", "-1" )
					.attr( "aria-hidden", "true" )
					.attr( "role", "region" )
					.each(function( i ){
						$( this ).attr( "aria-label", "slide " + ( i + 1 ) );
						$( this ).find( focusables ).attr( "tabindex", "-1" );
					});

				$activeItem
					.addClass( activeClass )
					.attr( "tabindex", "0" )
					.each(function( i ){
						$( this ).find( focusables ).attr( "tabindex", "0" );
					})
					.attr( "aria-hidden", "false" );

				return $(this).trigger( "update." + pluginName );
			},

			_transitionStart: function( $from, $to, reverseClass, index ){
				var $self = $(this);
				var self = this;

				var endEvent = navigator.userAgent.indexOf( "AppleWebKit" ) > -1 ? "webkitTransitionEnd" : "transitionend otransitionend";

				$(this).addClass( reverseClass );

				if( reverseClass ){
					// if we are going in reverse we need to wait until the final transition,
					// which is the old slide $from moving out, to re-enable transitions
					$from.one( endEvent, function(){
						$self[ pluginName ]( "_postTransitionCleanup", $from, $to, index );
					});

					// when going in reverse we want to move the $to slide into place
					// immediately.
					$to.addClass("no-transition");
					$to.addClass( inClass );

					// once the $to slide is in place then we want to do the normal transition
					// by removing no-transition and letting the removal of classes move things
					// forward
					setTimeout(function(){
						$to.removeClass("no-transition");
						$self[ pluginName ]( "_transitionEnd", $from, $to, reverseClass, index );
					}, 20);
				} else {
					$to.one( endEvent, function(){
						$self[ pluginName ]( "_transitionEnd", $from, $to, reverseClass, index );
						$self[ pluginName ]( "_postTransitionCleanup", $from, $to, index );
					});

					$from.addClass( outClass );
					$to.addClass( inClass );
				}
			},

			_transitionEnd: function( $from, $to, reverseClass, index ){
				$( this ).removeClass( reverseClass );

				// If the slides are moving forward prevent, the previous slide from
				// transitioning slowly to the slide stack.

				// This prevents botched transitions for 2 slide carousels because,
				// unless there's a third slide to move into position from the right,
				// the slow transition to the stack can leave it in an intermediate
				// state when the user clicks "next" again.
				if( !reverseClass ){
					$from.addClass("no-transition");
					setTimeout(function(){
						$from.removeClass("no-transition");
					});
				}

				$from.removeClass( outClass + " " + activeClass );
				$to.removeClass( inClass ).addClass( activeClass );
			},

			_postTransitionCleanup: function($from, $to, index){
				$this = $(this);
				$this[ pluginName ]( "update" );
				$this[ pluginName ]( "_addNextPrevClasses" );
				if( $( document.activeElement ).closest( $from[ 0 ] ).length ){
					$to.focus();
				}

				// if we're not going in reverse this is the end of the transitions, enable nav
				this.isNavDisabled = false;
				$this.trigger( "aftergoto." + pluginName, [ $to, index ] );
			},

			_bindEventListeners: function(){
				var $elem = $( this )
					.bind( "click", function( e ){
						var targ = $( e.target ).closest( "a[href='#next'],a[href='#prev']" );
						if( targ.length ){
							$elem[ pluginName ]( targ.is( "[href='#next']" ) ? "next" : "prev" );
							e.preventDefault();
						}
					});

				return this;
			},

			_addNextPrev: function(){
				var $nav, $this = $( this ), $items, $active;

				var prev = $( this ).attr( prevAttr ) || "Prev",
					next = $( this ).attr( nextAttr ) || "Next",
					prevTitle = $( this ).attr( prevTitleAttr) || "Previous",
					nextTitle = $( this ).attr( nextTitleAttr) || "Next";

				$nav = $("<nav class='"+ navClass +"' role='region' aria-label='carousel controls'>" +
					"<a href='#prev' class='prev' aria-label='" + prevTitle + "' title='" + prevTitle + " slide'>" + prev + "</a>" +
					"<a href='#next' class='next' aria-label='" + nextTitle + "' title='" + nextTitle + " slide'>" + next + "</a>" +
					"</nav>");

				$this.trigger( "beforecreatenav." + pluginName, { $nav: $nav });

				return $this.append( $nav )[ pluginName ]( "_bindEventListeners" );
			},

			destroy: function(){
				// TODO
			}
		};

	// Collection method.
	$.fn[ pluginName ] = function( arrg, a, b, c ) {
		return this.each(function() {

			// if it's a method
			if( arrg && typeof( arrg ) === "string" ){
				return $.fn[ pluginName ].prototype[ arrg ].call( this, a, b, c );
			}

			// don't re-init
			if( $( this ).data( pluginName + "active" ) ){
				return $( this );
			}

			// otherwise, init
			$( this ).data( pluginName + "active", true );
			$.fn[ pluginName ].prototype._create.call( this );
		});
	};

	// add methods
	prototype = $.extend( $.fn[ pluginName ].prototype, methods );
}(jQuery));

/*
 * responsive-carousel touch drag extension
 * https://github.com/filamentgroup/responsive-carousel
 *
 * Copyright (c) 2012 Filament Group, Inc.
 * Licensed under the MIT, GPL licenses.
 */

(function($) {

	var pluginName = "carousel",
		initSelector = "." + pluginName,
		noTrans = pluginName + "-no-transition",
		// UA is needed to determine whether to return true or false during touchmove (only iOS handles true gracefully)
		iOS = /iPhone|iPad|iPod/.test( navigator.platform ) && navigator.userAgent.indexOf( "AppleWebKit" ) > -1,
		touchMethods = {
			_dragBehavior: function(){
				var $self = $( this ),
					origin,
					data = {},
					xPerc,
					yPerc,
					stopMove,
					setData = function( e ){

						var touches = e.touches || e.originalEvent.touches,
							$elem = $( e.target ).closest( initSelector );

						if( e.type === "touchstart" ){
							origin = {
								x : touches[ 0 ].pageX,
								y: touches[ 0 ].pageY
							};
						}
						stopMove = false;
						if( touches[ 0 ] && touches[ 0 ].pageX ){
							data.touches = touches;
							data.deltaX = touches[ 0 ].pageX - origin.x;
							data.deltaY = touches[ 0 ].pageY - origin.y;
							data.w = $elem.width();
							data.h = $elem.height();
							data.xPercent = data.deltaX / data.w;
							data.yPercent = data.deltaY / data.h;
							data.srcEvent = e;
						}

					},
					emitEvents = function( e ){
						setData( e );
						if( data.touches.length === 1 ){
							$( e.target ).closest( initSelector ).trigger( pluginName + ".drag" + e.type.split( "touch" )[ 1 ], data );
						}
					};

				$( this )
					.bind( "touchstart", function( e ){
						// TODO move to component method
						if( !$(e.target).is("a.next") && !$(e.target).is("a.prev") ){
							$( this ).addClass( noTrans );
						}
						emitEvents( e );
					} )
					.bind( "touchmove", function( e ){
						if( Math.abs( data.deltaX ) > 10 ){
							e.preventDefault();
						}
						else if( Math.abs( data.deltaY ) > 3 ){
							stopMove = true;
						}
						if( !stopMove ){
							setData( e );
							emitEvents( e );
						}
					} )
					.bind( "touchend", function( e ){
						$( this ).removeClass( noTrans );
						emitEvents( e );
					} );


			}
		};

	// add methods
	$.extend( $.fn[ pluginName ].prototype, touchMethods );

	// DOM-ready auto-init
	$( document ).bind( "create." + pluginName, function( e ){
		$( e.target )[ pluginName ]( "_dragBehavior" );
	} );

}(jQuery));

/*
 * responsive-carousel touch drag transition
 * https://github.com/filamentgroup/responsive-carousel
 *
 * Copyright (c) 2012 Filament Group, Inc.
 * Licensed under the MIT, GPL licenses.
 */

(function($) {

	var pluginName = "carousel",
		initSelector = "." + pluginName,
		activeClass = pluginName + "-active",
		itemClass = pluginName + "-item",
		dragThreshold = function( deltaX ){
			return Math.abs( deltaX ) > 4;
		},
		getActiveSlides = function( $carousel, deltaX ){
			var $from = $carousel.find( "." + pluginName + "-active" ),
				activeNum = $from.prevAll().length + 1,
				forward = deltaX < 0,
				nextNum = activeNum + (forward ? 1 : -1),
				$to = $carousel.find( "." + itemClass ).eq( nextNum - 1 );

			if( !$to.length ){
				$to = $carousel.find( "." + itemClass )[ forward ? "first" : "last" ]();
			}

			return [ $from, $to, nextNum-1 ];
		};

	var endEvent = navigator.userAgent.indexOf( "AppleWebKit" ) ? "webkitTransitionEnd" : "transitionEnd";

	// Touch handling
	$( document )
		.bind( pluginName + ".dragmove", function( e, data ){
			if( !!data && !dragThreshold( data.deltaX ) ){
				return;
			}

			if( $( e.target ).attr( "data-transition" ) === "slide" ){
				var activeSlides = getActiveSlides( $( e.target ), data.deltaX );
				var $current = activeSlides[ 0 ];
				var $next = activeSlides[ 1 ];

				// remove any transition classes in case drag happened in the middle
				// of another transition and prevent any other transitions while dragging
				// also unbind transition end events from the main component to prevent
				// class application and other behavior from applying after the drag ends
				$current.add($next)
					.removeClass("carousel-in carousel-out")
					.addClass("no-transition")
					.unbind(endEvent);

				$current.css( "left", data.deltaX + "px" );
				$next.css( "left", data.deltaX < 0 ? data.w + data.deltaX + "px" : -data.w + data.deltaX + "px" );
			}
		})
		.bind( pluginName + ".dragend", function( e, data ){
			if( !!data && !dragThreshold( data.deltaX ) ){
				return;
			}

			var activeSlides = getActiveSlides( $( e.target ), data.deltaX );
			var $current = activeSlides[ 0 ];
			var $next = activeSlides[ 1 ];
			var $both = $current.add($next);
			var $carousel = $current.closest(".carousel");


			// use the absolute position from the left of the "from" slide to determine where
			// thing should end up
			newSlide = Math.abs(parseFloat(activeSlides[0].css("left").replace("px", ""))) > 45;


			// add the fast transition class to make transitions out of a drag quick
			// remove any no-transition class so the transition out of the drag can work
			$carousel.addClass("carousel-autoplay-stopped");
			$both.removeClass("no-transition");

			if( $( e.target ).attr( "data-transition" ) === "slide" ){
				$( e.target ).one( endEvent, function(){

					// add no transition to the slide that's going out and needs to move
					// back to the stack fast
					var $out = (newSlide ? $current : $next);
					$out.addClass("no-transition");
					setTimeout(function(){
						$out.removeClass("no-transition");
					}, 20);

					$current.add( $next ).css( "left", "" );
					$( e.target ).trigger( "goto." + pluginName, newSlide ? $next : $current );

					// remove the fast transition class so that other transitions can be slow
					$carousel.removeClass("carousel-autoplay-stopped");

					// do the post transition cleanup to make sure that the state in the
					// component is sane for future transitions and navigation
					if( newSlide ) {
							$carousel.carousel("_postTransitionCleanup", $current, $next);
					} else {
							$carousel.carousel("_postTransitionCleanup", $next, $current);
					}
				});

				// if we're heading to a new slide move the slide out
				(newSlide ? $current : $next)
					.removeClass( activeClass )
					.css( "left",
								newSlide ?
								(data.deltaX > 0 ? data.w	+ "px" : -data.w	+ "px") :
								(data.deltaX > 0 ? -data.w	+ "px" : data.w	+ "px"));

				// if we're heading to a new slide move the next one in
				(newSlide ? $next : $current)
					.addClass( activeClass )
					.css( "left", 0 );
			} else if( newSlide ){
				$( e.target )[ pluginName ]( data.deltaX > 0 ? "prev" : "next" );
			}
		});

}(jQuery));

/*
 * responsive-carousel ajax include extension
 * https://github.com/filamentgroup/responsive-carousel
 *
 * Copyright (c) 2012 Filament Group, Inc.
 * Licensed under the MIT, GPL licenses.
 */

(function($) {

	var pluginName = "carousel",
		initSelector = "." + pluginName;

	// DOM-ready auto-init
	$( document ).bind( "ajaxInclude", function( e ){
		$( e.target ).closest( initSelector )[ pluginName ]( "update" );
	} );

	// kick off ajaxIncs at dom ready
	$( function(){
		$( "[data-after],[data-before]", initSelector ).ajaxInclude();
	} );

}(jQuery));
/*
 * responsive-carousel autoplay extension
 * https://github.com/filamentgroup/responsive-carousel
 *
 * Copyright (c) 2012 Filament Group, Inc.
 * Licensed under the MIT, GPL licenses.
 */

(function( $, undefined ) {
	var pluginName = "carousel",
		interval = 4000,
		autoPlayMethods = {
			play: function(){
				var $self = $( this ),
					intAttr = $self.attr( "data-interval" ),
					thisInt = parseFloat( intAttr ) || interval;
				return $self.data(
					"timer",
					setInterval( function(){
						$self[ pluginName ]( "next" );
					},
					thisInt )
				);
			},

			stop: function(){
				clearTimeout( $( this ).data( "timer" ) );
			},

			_bindStopListener: function(){
				return $(this).bind( "mouseup keyup focus touchmove", function(){
					$( this )[ pluginName ]( "stop" );
				} );
			},

			_initAutoPlay: function(){
				var autoplayAttr = $( this ).attr( "data-autoplay" ),
					autoplay = (typeof autoplayAttr !== "undefined" &&
								autoplayAttr.toLowerCase() !== "false");
				if( autoplay ){
					$( this )
						[ pluginName ]( "_bindStopListener" )
						[ pluginName ]( "play" );
				}
			}
		};

	// add methods
	$.extend( $.fn[ pluginName ].prototype, autoPlayMethods );

	// DOM-ready auto-init
	$( document ).bind(  "create." + pluginName, function( e ){
		$( e.target )[ pluginName ]( "_initAutoPlay" );
	});

}(jQuery));

/*
 * responsive-carousel auto-init extension
 * https://github.com/filamentgroup/responsive-carousel
 *
 * Copyright (c) 2012 Filament Group, Inc.
 * Licensed under the MIT, GPL licenses.
 */

(function( $ ) {
	// DOM-ready auto-init
	$( document ).bind("enhance", function() {
		$( ".carousel" ).carousel();
	});
}( jQuery ));
/*
 * responsive-carousel pagination extension
 * https://github.com/filamentgroup/responsive-carousel
 *
 * Copyright (c) 2012 Filament Group, Inc.
 * Licensed under the MIT, GPL licenses.
 */

(function( $, undefined ) {
	var pluginName = "carousel",
		initSelector = "." + pluginName + "[data-paginate]",
		paginationClass = pluginName + "-pagination",
		activeClass = pluginName + "-active-page",
		paginationMethods = {
			_createPagination: function(){
				var nav = $( this ).find( "." + pluginName + "-nav" ),
					items = $( this ).find( "." + pluginName + "-item" ),
					pNav = $( "<ol class='" + paginationClass + "'></ol>" ),
					num, thumb, content, itemType;

				// remove any existing nav
				nav.find( "." + paginationClass ).remove();

				items.each(function(i){
						num = i + 1;
						thumb = $( this ).attr( "data-thumb" );
						itemType = $( this ).attr( "data-type" );
						content = num;
						if( thumb ){
							content = "<img src='" + thumb + "' alt=''>";
						}
						pNav.append( "<li" + ( itemType ? " class='carousel-" + itemType + "'" : "" ) + "><a href='#" + num + "' title='Go to slide " + num + "'>" + (itemType ? itemType : content )+ "</a>" );
					if( itemType ){
						nav.addClass( "has-" + itemType );
					}
				});


				if( thumb ){
					pNav.addClass( pluginName + "-nav-thumbs" );
				}

				nav
					.addClass( pluginName + "-nav-paginated" )
					.find( "a" ).first().after( pNav );

			},
			_bindPaginationEvents: function(){
				$( this )
					.bind( "click", function( e ){
						var pagLink = $( e.target );

						if( e.target.nodeName === "IMG" ){
							pagLink = pagLink.parent();
						}

						pagLink = pagLink.closest( "a" );
						var href = pagLink.attr( "href" );

						if( pagLink.closest( "." + paginationClass ).length && href ){
							$( this )[ pluginName ]( "goTo", parseFloat( href.split( "#" )[ 1 ] ) );
							e.preventDefault();
						}
					} )
					// update pagination on page change
					.bind( "updateactive." + pluginName + " aftergoto." + pluginName, function( e ){
						var index = 0;
						$( this ).find("." + pluginName + "-item" ).each(function(i){
							if( $( this ).is( "." + pluginName + "-active" ) ){
								index = i;
							}
						});

						$( this ).find( "ol." + paginationClass + " li" )
							.removeClass( activeClass )
							.eq( index )
								.addClass( activeClass );
					} )
					.trigger( "updateactive." + pluginName );

			}
		};

	// add methods
	$.extend( $.fn[ pluginName ].prototype, paginationMethods );

	// create pagination on create and update
	$( document )
		.bind( "create." + pluginName, function( e ){
			$( e.target )
				[ pluginName ]( "_createPagination" )
				[ pluginName ]( "_bindPaginationEvents" );
		} )
		.bind( "update." + pluginName, function( e ){
			$( e.target )[ pluginName ]( "_createPagination" );
		} );

}(jQuery));

/*!
Waypoints - 4.0.1
Copyright © 2011-2016 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/waypoints/blob/master/licenses.txt
*/
!function(){"use strict";function t(o){if(!o)throw new Error("No options passed to Waypoint constructor");if(!o.element)throw new Error("No element option passed to Waypoint constructor");if(!o.handler)throw new Error("No handler option passed to Waypoint constructor");this.key="waypoint-"+e,this.options=t.Adapter.extend({},t.defaults,o),this.element=this.options.element,this.adapter=new t.Adapter(this.element),this.callback=o.handler,this.axis=this.options.horizontal?"horizontal":"vertical",this.enabled=this.options.enabled,this.triggerPoint=null,this.group=t.Group.findOrCreate({name:this.options.group,axis:this.axis}),this.context=t.Context.findOrCreateByElement(this.options.context),t.offsetAliases[this.options.offset]&&(this.options.offset=t.offsetAliases[this.options.offset]),this.group.add(this),this.context.add(this),i[this.key]=this,e+=1}var e=0,i={};t.prototype.queueTrigger=function(t){this.group.queueTrigger(this,t)},t.prototype.trigger=function(t){this.enabled&&this.callback&&this.callback.apply(this,t)},t.prototype.destroy=function(){this.context.remove(this),this.group.remove(this),delete i[this.key]},t.prototype.disable=function(){return this.enabled=!1,this},t.prototype.enable=function(){return this.context.refresh(),this.enabled=!0,this},t.prototype.next=function(){return this.group.next(this)},t.prototype.previous=function(){return this.group.previous(this)},t.invokeAll=function(t){var e=[];for(var o in i)e.push(i[o]);for(var n=0,r=e.length;r>n;n++)e[n][t]()},t.destroyAll=function(){t.invokeAll("destroy")},t.disableAll=function(){t.invokeAll("disable")},t.enableAll=function(){t.Context.refreshAll();for(var e in i)i[e].enabled=!0;return this},t.refreshAll=function(){t.Context.refreshAll()},t.viewportHeight=function(){return window.innerHeight||document.documentElement.clientHeight},t.viewportWidth=function(){return document.documentElement.clientWidth},t.adapters=[],t.defaults={context:window,continuous:!0,enabled:!0,group:"default",horizontal:!1,offset:0},t.offsetAliases={"bottom-in-view":function(){return this.context.innerHeight()-this.adapter.outerHeight()},"right-in-view":function(){return this.context.innerWidth()-this.adapter.outerWidth()}},window.Waypoint=t}(),function(){"use strict";function t(t){window.setTimeout(t,1e3/60)}function e(t){this.element=t,this.Adapter=n.Adapter,this.adapter=new this.Adapter(t),this.key="waypoint-context-"+i,this.didScroll=!1,this.didResize=!1,this.oldScroll={x:this.adapter.scrollLeft(),y:this.adapter.scrollTop()},this.waypoints={vertical:{},horizontal:{}},t.waypointContextKey=this.key,o[t.waypointContextKey]=this,i+=1,n.windowContext||(n.windowContext=!0,n.windowContext=new e(window)),this.createThrottledScrollHandler(),this.createThrottledResizeHandler()}var i=0,o={},n=window.Waypoint,r=window.onload;e.prototype.add=function(t){var e=t.options.horizontal?"horizontal":"vertical";this.waypoints[e][t.key]=t,this.refresh()},e.prototype.checkEmpty=function(){var t=this.Adapter.isEmptyObject(this.waypoints.horizontal),e=this.Adapter.isEmptyObject(this.waypoints.vertical),i=this.element==this.element.window;t&&e&&!i&&(this.adapter.off(".waypoints"),delete o[this.key])},e.prototype.createThrottledResizeHandler=function(){function t(){e.handleResize(),e.didResize=!1}var e=this;this.adapter.on("resize.waypoints",function(){e.didResize||(e.didResize=!0,n.requestAnimationFrame(t))})},e.prototype.createThrottledScrollHandler=function(){function t(){e.handleScroll(),e.didScroll=!1}var e=this;this.adapter.on("scroll.waypoints",function(){(!e.didScroll||n.isTouch)&&(e.didScroll=!0,n.requestAnimationFrame(t))})},e.prototype.handleResize=function(){n.Context.refreshAll()},e.prototype.handleScroll=function(){var t={},e={horizontal:{newScroll:this.adapter.scrollLeft(),oldScroll:this.oldScroll.x,forward:"right",backward:"left"},vertical:{newScroll:this.adapter.scrollTop(),oldScroll:this.oldScroll.y,forward:"down",backward:"up"}};for(var i in e){var o=e[i],n=o.newScroll>o.oldScroll,r=n?o.forward:o.backward;for(var s in this.waypoints[i]){var a=this.waypoints[i][s];if(null!==a.triggerPoint){var l=o.oldScroll<a.triggerPoint,h=o.newScroll>=a.triggerPoint,p=l&&h,u=!l&&!h;(p||u)&&(a.queueTrigger(r),t[a.group.id]=a.group)}}}for(var c in t)t[c].flushTriggers();this.oldScroll={x:e.horizontal.newScroll,y:e.vertical.newScroll}},e.prototype.innerHeight=function(){return this.element==this.element.window?n.viewportHeight():this.adapter.innerHeight()},e.prototype.remove=function(t){delete this.waypoints[t.axis][t.key],this.checkEmpty()},e.prototype.innerWidth=function(){return this.element==this.element.window?n.viewportWidth():this.adapter.innerWidth()},e.prototype.destroy=function(){var t=[];for(var e in this.waypoints)for(var i in this.waypoints[e])t.push(this.waypoints[e][i]);for(var o=0,n=t.length;n>o;o++)t[o].destroy()},e.prototype.refresh=function(){var t,e=this.element==this.element.window,i=e?void 0:this.adapter.offset(),o={};this.handleScroll(),t={horizontal:{contextOffset:e?0:i.left,contextScroll:e?0:this.oldScroll.x,contextDimension:this.innerWidth(),oldScroll:this.oldScroll.x,forward:"right",backward:"left",offsetProp:"left"},vertical:{contextOffset:e?0:i.top,contextScroll:e?0:this.oldScroll.y,contextDimension:this.innerHeight(),oldScroll:this.oldScroll.y,forward:"down",backward:"up",offsetProp:"top"}};for(var r in t){var s=t[r];for(var a in this.waypoints[r]){var l,h,p,u,c,d=this.waypoints[r][a],f=d.options.offset,w=d.triggerPoint,y=0,g=null==w;d.element!==d.element.window&&(y=d.adapter.offset()[s.offsetProp]),"function"==typeof f?f=f.apply(d):"string"==typeof f&&(f=parseFloat(f),d.options.offset.indexOf("%")>-1&&(f=Math.ceil(s.contextDimension*f/100))),l=s.contextScroll-s.contextOffset,d.triggerPoint=Math.floor(y+l-f),h=w<s.oldScroll,p=d.triggerPoint>=s.oldScroll,u=h&&p,c=!h&&!p,!g&&u?(d.queueTrigger(s.backward),o[d.group.id]=d.group):!g&&c?(d.queueTrigger(s.forward),o[d.group.id]=d.group):g&&s.oldScroll>=d.triggerPoint&&(d.queueTrigger(s.forward),o[d.group.id]=d.group)}}return n.requestAnimationFrame(function(){for(var t in o)o[t].flushTriggers()}),this},e.findOrCreateByElement=function(t){return e.findByElement(t)||new e(t)},e.refreshAll=function(){for(var t in o)o[t].refresh()},e.findByElement=function(t){return o[t.waypointContextKey]},window.onload=function(){r&&r(),e.refreshAll()},n.requestAnimationFrame=function(e){var i=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||t;i.call(window,e)},n.Context=e}(),function(){"use strict";function t(t,e){return t.triggerPoint-e.triggerPoint}function e(t,e){return e.triggerPoint-t.triggerPoint}function i(t){this.name=t.name,this.axis=t.axis,this.id=this.name+"-"+this.axis,this.waypoints=[],this.clearTriggerQueues(),o[this.axis][this.name]=this}var o={vertical:{},horizontal:{}},n=window.Waypoint;i.prototype.add=function(t){this.waypoints.push(t)},i.prototype.clearTriggerQueues=function(){this.triggerQueues={up:[],down:[],left:[],right:[]}},i.prototype.flushTriggers=function(){for(var i in this.triggerQueues){var o=this.triggerQueues[i],n="up"===i||"left"===i;o.sort(n?e:t);for(var r=0,s=o.length;s>r;r+=1){var a=o[r];(a.options.continuous||r===o.length-1)&&a.trigger([i])}}this.clearTriggerQueues()},i.prototype.next=function(e){this.waypoints.sort(t);var i=n.Adapter.inArray(e,this.waypoints),o=i===this.waypoints.length-1;return o?null:this.waypoints[i+1]},i.prototype.previous=function(e){this.waypoints.sort(t);var i=n.Adapter.inArray(e,this.waypoints);return i?this.waypoints[i-1]:null},i.prototype.queueTrigger=function(t,e){this.triggerQueues[e].push(t)},i.prototype.remove=function(t){var e=n.Adapter.inArray(t,this.waypoints);e>-1&&this.waypoints.splice(e,1)},i.prototype.first=function(){return this.waypoints[0]},i.prototype.last=function(){return this.waypoints[this.waypoints.length-1]},i.findOrCreate=function(t){return o[t.axis][t.name]||new i(t)},n.Group=i}(),function(){"use strict";function t(t){this.$element=e(t)}var e=window.jQuery,i=window.Waypoint;e.each(["innerHeight","innerWidth","off","offset","on","outerHeight","outerWidth","scrollLeft","scrollTop"],function(e,i){t.prototype[i]=function(){var t=Array.prototype.slice.call(arguments);return this.$element[i].apply(this.$element,t)}}),e.each(["extend","inArray","isEmptyObject"],function(i,o){t[o]=e[o]}),i.adapters.push({name:"jquery",Adapter:t}),i.Adapter=t}(),function(){"use strict";function t(t){return function(){var i=[],o=arguments[0];return t.isFunction(arguments[0])&&(o=t.extend({},arguments[1]),o.handler=arguments[0]),this.each(function(){var n=t.extend({},o,{element:this});"string"==typeof n.context&&(n.context=t(this).closest(n.context)[0]),i.push(new e(n))}),i}}var e=window.Waypoint;window.jQuery&&(window.jQuery.fn.waypoint=t(window.jQuery)),window.Zepto&&(window.Zepto.fn.waypoint=t(window.Zepto))}();
/*!
 * imagesLoaded PACKAGED v3.2.0
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

/*!
 * EventEmitter v4.2.6 - git.io/ee
 * Oliver Caldwell
 * MIT license
 * @preserve
 */

(function () {
	'use strict';

	/**
	 * Class for managing events.
	 * Can be extended to provide event functionality in other classes.
	 *
	 * @class EventEmitter Manages event registering and emitting.
	 */
	function EventEmitter() {}

	// Shortcuts to improve speed and size
	var proto = EventEmitter.prototype;
	var exports = this;
	var originalGlobalValue = exports.EventEmitter;

	/**
	 * Finds the index of the listener for the event in it's storage array.
	 *
	 * @param {Function[]} listeners Array of listeners to search through.
	 * @param {Function} listener Method to look for.
	 * @return {Number} Index of the specified listener, -1 if not found
	 * @api private
	 */
	function indexOfListener(listeners, listener) {
		var i = listeners.length;
		while (i--) {
			if (listeners[i].listener === listener) {
				return i;
			}
		}

		return -1;
	}

	/**
	 * Alias a method while keeping the context correct, to allow for overwriting of target method.
	 *
	 * @param {String} name The name of the target method.
	 * @return {Function} The aliased method
	 * @api private
	 */
	function alias(name) {
		return function aliasClosure() {
			return this[name].apply(this, arguments);
		};
	}

	/**
	 * Returns the listener array for the specified event.
	 * Will initialise the event object and listener arrays if required.
	 * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
	 * Each property in the object response is an array of listener functions.
	 *
	 * @param {String|RegExp} evt Name of the event to return the listeners from.
	 * @return {Function[]|Object} All listener functions for the event.
	 */
	proto.getListeners = function getListeners(evt) {
		var events = this._getEvents();
		var response;
		var key;

		// Return a concatenated array of all matching events if
		// the selector is a regular expression.
		if (typeof evt === 'object') {
			response = {};
			for (key in events) {
				if (events.hasOwnProperty(key) && evt.test(key)) {
					response[key] = events[key];
				}
			}
		}
		else {
			response = events[evt] || (events[evt] = []);
		}

		return response;
	};

	/**
	 * Takes a list of listener objects and flattens it into a list of listener functions.
	 *
	 * @param {Object[]} listeners Raw listener objects.
	 * @return {Function[]} Just the listener functions.
	 */
	proto.flattenListeners = function flattenListeners(listeners) {
		var flatListeners = [];
		var i;

		for (i = 0; i < listeners.length; i += 1) {
			flatListeners.push(listeners[i].listener);
		}

		return flatListeners;
	};

	/**
	 * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
	 *
	 * @param {String|RegExp} evt Name of the event to return the listeners from.
	 * @return {Object} All listener functions for an event in an object.
	 */
	proto.getListenersAsObject = function getListenersAsObject(evt) {
		var listeners = this.getListeners(evt);
		var response;

		if (listeners instanceof Array) {
			response = {};
			response[evt] = listeners;
		}

		return response || listeners;
	};

	/**
	 * Adds a listener function to the specified event.
	 * The listener will not be added if it is a duplicate.
	 * If the listener returns true then it will be removed after it is called.
	 * If you pass a regular expression as the event name then the listener will be added to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to attach the listener to.
	 * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addListener = function addListener(evt, listener) {
		var listeners = this.getListenersAsObject(evt);
		var listenerIsWrapped = typeof listener === 'object';
		var key;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
				listeners[key].push(listenerIsWrapped ? listener : {
					listener: listener,
					once: false
				});
			}
		}

		return this;
	};

	/**
	 * Alias of addListener
	 */
	proto.on = alias('addListener');

	/**
	 * Semi-alias of addListener. It will add a listener that will be
	 * automatically removed after it's first execution.
	 *
	 * @param {String|RegExp} evt Name of the event to attach the listener to.
	 * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addOnceListener = function addOnceListener(evt, listener) {
		return this.addListener(evt, {
			listener: listener,
			once: true
		});
	};

	/**
	 * Alias of addOnceListener.
	 */
	proto.once = alias('addOnceListener');

	/**
	 * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
	 * You need to tell it what event names should be matched by a regex.
	 *
	 * @param {String} evt Name of the event to create.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.defineEvent = function defineEvent(evt) {
		this.getListeners(evt);
		return this;
	};

	/**
	 * Uses defineEvent to define multiple events.
	 *
	 * @param {String[]} evts An array of event names to define.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.defineEvents = function defineEvents(evts) {
		for (var i = 0; i < evts.length; i += 1) {
			this.defineEvent(evts[i]);
		}
		return this;
	};

	/**
	 * Removes a listener function from the specified event.
	 * When passed a regular expression as the event name, it will remove the listener from all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to remove the listener from.
	 * @param {Function} listener Method to remove from the event.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeListener = function removeListener(evt, listener) {
		var listeners = this.getListenersAsObject(evt);
		var index;
		var key;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key)) {
				index = indexOfListener(listeners[key], listener);

				if (index !== -1) {
					listeners[key].splice(index, 1);
				}
			}
		}

		return this;
	};

	/**
	 * Alias of removeListener
	 */
	proto.off = alias('removeListener');

	/**
	 * Adds listeners in bulk using the manipulateListeners method.
	 * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
	 * You can also pass it a regular expression to add the array of listeners to all events that match it.
	 * Yeah, this function does quite a bit. That's probably a bad thing.
	 *
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to add.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addListeners = function addListeners(evt, listeners) {
		// Pass through to manipulateListeners
		return this.manipulateListeners(false, evt, listeners);
	};

	/**
	 * Removes listeners in bulk using the manipulateListeners method.
	 * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
	 * You can also pass it an event name and an array of listeners to be removed.
	 * You can also pass it a regular expression to remove the listeners from all events that match it.
	 *
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to remove.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeListeners = function removeListeners(evt, listeners) {
		// Pass through to manipulateListeners
		return this.manipulateListeners(true, evt, listeners);
	};

	/**
	 * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
	 * The first argument will determine if the listeners are removed (true) or added (false).
	 * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
	 * You can also pass it an event name and an array of listeners to be added/removed.
	 * You can also pass it a regular expression to manipulate the listeners of all events that match it.
	 *
	 * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
		var i;
		var value;
		var single = remove ? this.removeListener : this.addListener;
		var multiple = remove ? this.removeListeners : this.addListeners;

		// If evt is an object then pass each of it's properties to this method
		if (typeof evt === 'object' && !(evt instanceof RegExp)) {
			for (i in evt) {
				if (evt.hasOwnProperty(i) && (value = evt[i])) {
					// Pass the single listener straight through to the singular method
					if (typeof value === 'function') {
						single.call(this, i, value);
					}
					else {
						// Otherwise pass back to the multiple function
						multiple.call(this, i, value);
					}
				}
			}
		}
		else {
			// So evt must be a string
			// And listeners must be an array of listeners
			// Loop over it and pass each one to the multiple method
			i = listeners.length;
			while (i--) {
				single.call(this, evt, listeners[i]);
			}
		}

		return this;
	};

	/**
	 * Removes all listeners from a specified event.
	 * If you do not specify an event then all listeners will be removed.
	 * That means every event will be emptied.
	 * You can also pass a regex to remove all events that match it.
	 *
	 * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeEvent = function removeEvent(evt) {
		var type = typeof evt;
		var events = this._getEvents();
		var key;

		// Remove different things depending on the state of evt
		if (type === 'string') {
			// Remove all listeners for the specified event
			delete events[evt];
		}
		else if (type === 'object') {
			// Remove all events matching the regex.
			for (key in events) {
				if (events.hasOwnProperty(key) && evt.test(key)) {
					delete events[key];
				}
			}
		}
		else {
			// Remove all listeners in all events
			delete this._events;
		}

		return this;
	};

	/**
	 * Alias of removeEvent.
	 *
	 * Added to mirror the node API.
	 */
	proto.removeAllListeners = alias('removeEvent');

	/**
	 * Emits an event of your choice.
	 * When emitted, every listener attached to that event will be executed.
	 * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
	 * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
	 * So they will not arrive within the array on the other side, they will be separate.
	 * You can also pass a regular expression to emit to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
	 * @param {Array} [args] Optional array of arguments to be passed to each listener.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.emitEvent = function emitEvent(evt, args) {
		var listeners = this.getListenersAsObject(evt);
		var listener;
		var i;
		var key;
		var response;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key)) {
				i = listeners[key].length;

				while (i--) {
					// If the listener returns true then it shall be removed from the event
					// The function is executed either with a basic call or an apply if there is an args array
					listener = listeners[key][i];

					if (listener.once === true) {
						this.removeListener(evt, listener.listener);
					}

					response = listener.listener.apply(this, args || []);

					if (response === this._getOnceReturnValue()) {
						this.removeListener(evt, listener.listener);
					}
				}
			}
		}

		return this;
	};

	/**
	 * Alias of emitEvent
	 */
	proto.trigger = alias('emitEvent');

	/**
	 * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
	 * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
	 * @param {...*} Optional additional arguments to be passed to each listener.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.emit = function emit(evt) {
		var args = Array.prototype.slice.call(arguments, 1);
		return this.emitEvent(evt, args);
	};

	/**
	 * Sets the current value to check against when executing listeners. If a
	 * listeners return value matches the one set here then it will be removed
	 * after execution. This value defaults to true.
	 *
	 * @param {*} value The new value to check for when executing listeners.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.setOnceReturnValue = function setOnceReturnValue(value) {
		this._onceReturnValue = value;
		return this;
	};

	/**
	 * Fetches the current value to check against when executing listeners. If
	 * the listeners return value matches this one then it should be removed
	 * automatically. It will return true by default.
	 *
	 * @return {*|Boolean} The current value to check for or the default, true.
	 * @api private
	 */
	proto._getOnceReturnValue = function _getOnceReturnValue() {
		if (this.hasOwnProperty('_onceReturnValue')) {
			return this._onceReturnValue;
		}
		else {
			return true;
		}
	};

	/**
	 * Fetches the events object and creates one if required.
	 *
	 * @return {Object} The events storage object.
	 * @api private
	 */
	proto._getEvents = function _getEvents() {
		return this._events || (this._events = {});
	};

	/**
	 * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
	 *
	 * @return {Function} Non conflicting EventEmitter class.
	 */
	EventEmitter.noConflict = function noConflict() {
		exports.EventEmitter = originalGlobalValue;
		return EventEmitter;
	};

	// Expose the class either via AMD, CommonJS or the global object
	if (typeof define === 'function' && define.amd) {
		define('eventEmitter/EventEmitter',[],function () {
			return EventEmitter;
		});
	}
	else if (typeof module === 'object' && module.exports){
		module.exports = EventEmitter;
	}
	else {
		this.EventEmitter = EventEmitter;
	}
}.call(this));

/*!
 * eventie v1.0.4
 * event binding helper
 *   eventie.bind( elem, 'click', myFn )
 *   eventie.unbind( elem, 'click', myFn )
 */

/*jshint browser: true, undef: true, unused: true */
/*global define: false */

( function( window ) {



var docElem = document.documentElement;

var bind = function() {};

function getIEEvent( obj ) {
  var event = window.event;
  // add event.target
  event.target = event.target || event.srcElement || obj;
  return event;
}

if ( docElem.addEventListener ) {
  bind = function( obj, type, fn ) {
    obj.addEventListener( type, fn, false );
  };
} else if ( docElem.attachEvent ) {
  bind = function( obj, type, fn ) {
    obj[ type + fn ] = fn.handleEvent ?
      function() {
        var event = getIEEvent( obj );
        fn.handleEvent.call( fn, event );
      } :
      function() {
        var event = getIEEvent( obj );
        fn.call( obj, event );
      };
    obj.attachEvent( "on" + type, obj[ type + fn ] );
  };
}

var unbind = function() {};

if ( docElem.removeEventListener ) {
  unbind = function( obj, type, fn ) {
    obj.removeEventListener( type, fn, false );
  };
} else if ( docElem.detachEvent ) {
  unbind = function( obj, type, fn ) {
    obj.detachEvent( "on" + type, obj[ type + fn ] );
    try {
      delete obj[ type + fn ];
    } catch ( err ) {
      // can't delete window object properties
      obj[ type + fn ] = undefined;
    }
  };
}

var eventie = {
  bind: bind,
  unbind: unbind
};

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( 'eventie/eventie',eventie );
} else {
  // browser global
  window.eventie = eventie;
}

})( this );

/*!
 * imagesLoaded v3.2.0
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

( function( window, factory ) { 'use strict';
  // universal module definition

  /*global define: false, module: false, require: false */

  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( [
      'eventEmitter/EventEmitter',
      'eventie/eventie'
    ], function( EventEmitter, eventie ) {
      return factory( window, EventEmitter, eventie );
    });
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS
    module.exports = factory(
      window,
      require('wolfy87-eventemitter'),
      require('eventie')
    );
  } else {
    // browser global
    window.imagesLoaded = factory(
      window,
      window.EventEmitter,
      window.eventie
    );
  }

})( window,

// --------------------------  factory -------------------------- //

function factory( window, EventEmitter, eventie ) {



var $ = window.jQuery;
var console = window.console;

// -------------------------- helpers -------------------------- //

// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

var objToString = Object.prototype.toString;
function isArray( obj ) {
  return objToString.call( obj ) == '[object Array]';
}

// turn element or nodeList into an array
function makeArray( obj ) {
  var ary = [];
  if ( isArray( obj ) ) {
    // use object if already an array
    ary = obj;
  } else if ( typeof obj.length == 'number' ) {
    // convert nodeList to array
    for ( var i=0; i < obj.length; i++ ) {
      ary.push( obj[i] );
    }
  } else {
    // array of single index
    ary.push( obj );
  }
  return ary;
}

  // -------------------------- imagesLoaded -------------------------- //

  /**
   * @param {Array, Element, NodeList, String} elem
   * @param {Object or Function} options - if function, use as callback
   * @param {Function} onAlways - callback function
   */
  function ImagesLoaded( elem, options, onAlways ) {
    // coerce ImagesLoaded() without new, to be new ImagesLoaded()
    if ( !( this instanceof ImagesLoaded ) ) {
      return new ImagesLoaded( elem, options, onAlways );
    }
    // use elem as selector string
    if ( typeof elem == 'string' ) {
      elem = document.querySelectorAll( elem );
    }

    this.elements = makeArray( elem );
    this.options = extend( {}, this.options );

    if ( typeof options == 'function' ) {
      onAlways = options;
    } else {
      extend( this.options, options );
    }

    if ( onAlways ) {
      this.on( 'always', onAlways );
    }

    this.getImages();

    if ( $ ) {
      // add jQuery Deferred object
      // this.jqDeferred = new $.Deferred();
    }

    // HACK check async to allow time to bind listeners
    var _this = this;
    setTimeout( function() {
      _this.check();
    });
  }

  ImagesLoaded.prototype = new EventEmitter();

  ImagesLoaded.prototype.options = {};

  ImagesLoaded.prototype.getImages = function() {
    this.images = [];

    // filter & find items if we have an item selector
    for ( var i=0; i < this.elements.length; i++ ) {
      var elem = this.elements[i];
      this.addElementImages( elem );
    }
  };

  /**
   * @param {Node} element
   */
  ImagesLoaded.prototype.addElementImages = function( elem ) {
    // filter siblings
    if ( elem.nodeName == 'IMG' ) {
      this.addImage( elem );
    }
    // get background image on element
    if ( this.options.background === true ) {
      this.addElementBackgroundImages( elem );
    }

    // find children
    // no non-element nodes, #143
    var nodeType = elem.nodeType;
    if ( !nodeType || !elementNodeTypes[ nodeType ] ) {
      return;
    }
    var childImgs = elem.querySelectorAll('img');
    // concat childElems to filterFound array
    for ( var i=0; i < childImgs.length; i++ ) {
      var img = childImgs[i];
      this.addImage( img );
    }

    // get child background images
    if ( typeof this.options.background == 'string' ) {
      var children = elem.querySelectorAll( this.options.background );
      for ( i=0; i < children.length; i++ ) {
        var child = children[i];
        this.addElementBackgroundImages( child );
      }
    }
  };

  var elementNodeTypes = {
    1: true,
    9: true,
    11: true
  };

  ImagesLoaded.prototype.addElementBackgroundImages = function( elem ) {
    var style = getStyle( elem );
    // get url inside url("...")
    var reURL = /url\(['"]*([^'"\)]+)['"]*\)/gi;
    var matches = reURL.exec( style.backgroundImage );
    while ( matches !== null ) {
      var url = matches && matches[1];
      if ( url ) {
        this.addBackground( url, elem );
      }
      matches = reURL.exec( style.backgroundImage );
    }
  };

  // IE8
  var getStyle = window.getComputedStyle || function( elem ) {
    return elem.currentStyle;
  };

  /**
   * @param {Image} img
   */
  ImagesLoaded.prototype.addImage = function( img ) {
    var loadingImage = new LoadingImage( img );
    this.images.push( loadingImage );
  };

  ImagesLoaded.prototype.addBackground = function( url, elem ) {
    var background = new Background( url, elem );
    this.images.push( background );
  };

  ImagesLoaded.prototype.check = function() {
    var _this = this;
    this.progressedCount = 0;
    this.hasAnyBroken = false;
    // complete if no images
    if ( !this.images.length ) {
      this.complete();
      return;
    }

    function onProgress( image, elem, message ) {
      // HACK - Chrome triggers event before object properties have changed. #83
      setTimeout( function() {
        _this.progress( image, elem, message );
      });
    }

    for ( var i=0; i < this.images.length; i++ ) {
      var loadingImage = this.images[i];
      loadingImage.once( 'progress', onProgress );
      loadingImage.check();
    }
  };

  ImagesLoaded.prototype.progress = function( image, elem, message ) {
    this.progressedCount++;
    this.hasAnyBroken = this.hasAnyBroken || !image.isLoaded;
    // progress event
    this.emit( 'progress', this, image, elem );
    if ( this.jqDeferred && this.jqDeferred.notify ) {
      this.jqDeferred.notify( this, image );
    }
    // check if completed
    if ( this.progressedCount == this.images.length ) {
      this.complete();
    }

    if ( this.options.debug && console ) {
      console.log( 'progress: ' + message, image, elem );
    }
  };

  ImagesLoaded.prototype.complete = function() {
    var eventName = this.hasAnyBroken ? 'fail' : 'done';
    this.isComplete = true;
    this.emit( eventName, this );
    this.emit( 'always', this );
    if ( this.jqDeferred ) {
      var jqMethod = this.hasAnyBroken ? 'reject' : 'resolve';
      this.jqDeferred[ jqMethod ]( this );
    }
  };

  // --------------------------  -------------------------- //

  function LoadingImage( img ) {
    this.img = img;
  }

  LoadingImage.prototype = new EventEmitter();

  LoadingImage.prototype.check = function() {
    // If complete is true and browser supports natural sizes,
    // try to check for image status manually.
    var isComplete = this.getIsImageComplete();
    if ( isComplete ) {
      // report based on naturalWidth
      this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
      return;
    }

    // If none of the checks above matched, simulate loading on detached element.
    this.proxyImage = new Image();
    eventie.bind( this.proxyImage, 'load', this );
    eventie.bind( this.proxyImage, 'error', this );
    // bind to image as well for Firefox. #191
    eventie.bind( this.img, 'load', this );
    eventie.bind( this.img, 'error', this );
    this.proxyImage.src = this.img.src;
  };

  LoadingImage.prototype.getIsImageComplete = function() {
    return this.img.complete && this.img.naturalWidth !== undefined;
  };

  LoadingImage.prototype.confirm = function( isLoaded, message ) {
    this.isLoaded = isLoaded;
    this.emit( 'progress', this, this.img, message );
  };

  // ----- events ----- //

  // trigger specified handler for event type
  LoadingImage.prototype.handleEvent = function( event ) {
    var method = 'on' + event.type;
    if ( this[ method ] ) {
      this[ method ]( event );
    }
  };

  LoadingImage.prototype.onload = function() {
    this.confirm( true, 'onload' );
    this.unbindEvents();
  };

  LoadingImage.prototype.onerror = function() {
    this.confirm( false, 'onerror' );
    this.unbindEvents();
  };

  LoadingImage.prototype.unbindEvents = function() {
    eventie.unbind( this.proxyImage, 'load', this );
    eventie.unbind( this.proxyImage, 'error', this );
    eventie.unbind( this.img, 'load', this );
    eventie.unbind( this.img, 'error', this );
  };

  // -------------------------- Background -------------------------- //

  function Background( url, element ) {
    this.url = url;
    this.element = element;
    this.img = new Image();
  }

  // inherit LoadingImage prototype
  Background.prototype = new LoadingImage();

  Background.prototype.check = function() {
    eventie.bind( this.img, 'load', this );
    eventie.bind( this.img, 'error', this );
    this.img.src = this.url;
    // check if image is already complete
    var isComplete = this.getIsImageComplete();
    if ( isComplete ) {
      this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
      this.unbindEvents();
    }
  };

  Background.prototype.unbindEvents = function() {
    eventie.unbind( this.img, 'load', this );
    eventie.unbind( this.img, 'error', this );
  };

  Background.prototype.confirm = function( isLoaded, message ) {
    this.isLoaded = isLoaded;
    this.emit( 'progress', this, this.element, message );
  };

  // -------------------------- jQuery -------------------------- //

  ImagesLoaded.makeJQueryPlugin = function( jQuery ) {
    jQuery = jQuery || window.jQuery;
    if ( !jQuery ) {
      return;
    }
    // set local variable
    $ = jQuery;
    // $().imagesLoaded()
    $.fn.imagesLoaded = function( options, callback ) {
      var instance = new ImagesLoaded( this, options, callback );
      return instance.jqDeferred.promise( $(this) );
    };
  };
  // try making plugin
  ImagesLoaded.makeJQueryPlugin();

  // --------------------------  -------------------------- //

  return ImagesLoaded;

});


/*
Carousel helpers:
- Wraps .carousel elements in HTML shims, so appendAround.js can reposition the carousel at different breakpoints
- Sets the height of the images in each carousel to be a uniform height
*/
(function( $ ) {
    "use strict";

    var componentName = "eyp-carousel",
        enhancedAttr = "data-enhanced-" + componentName,
        initSelector = "." + componentName + ":not([" + enhancedAttr + "])";

    // Function to calculate heights in our carousel
    var fixCarouselHeight = function( carousel ) {
        var min = 0,
            $carousel = $( carousel ),
            $imgs = $carousel.find( "img" );

        $imgs.each( function( count ) {
            var $img = $( this );

            // Clear out any inline heights, and let the CSS take over.
            $img.attr( "style", "" );

            // Measure the height of the image
            var height = $img.height();

            if ( count === 0 || height < min ) {
                min = height;
            }
        } );

        if ( min > 0 ) {
            $( "img",  $carousel ).height( min );
        }
    };

    // Expose it
    EYP.utils.fixCarouselHeight = fixCarouselHeight;

    var fixAllCarouselHeights = function() {
        $( "." + componentName ).each( function() {
            EYP.utils.fixCarouselHeight( this );
        } );
    };

    // Resize handler
    $( window ).bind( "resize", EYP.utils.debounce( function() {
        fixAllCarouselHeights();
    }, 250 ) );

    // Process the carousels
    $.fn[ componentName ] = function() {
        return this.each( function( count ) {

            // The appendAround library needs `[data-set]` blocks to move content around, so let’s define a markup “template” we’ll use for each carousel.
            var shim = '<div class="carousel-wrap carousel-{slot}" data-set="carousel-{id}"></div>';

            // Variables! Are! Great!
            var $this = $( this ),
                $container = $this.parent(),
                shim = shim.split( "{id}" ).join( count );

            // Let’s take our little shim “template”, and drop in the right slots
            var shimDefault = shim.split( "{slot}" ).join( "default" ),
                shimWide = shim.split( "{slot}" ).join( "secondary" );

            // Insert our shim elements into the document
            $( shimDefault ).insertBefore( $this );
            $( shimWide ).prependTo( $container );

            // There’s no .wrap() in shoestring ( ¯\_(ツ)_/¯ ), so we’ll make do with this for now.
            $this.appendTo( $( "[data-set=carousel-" + count + "].carousel-default" ) );

            $( "[data-set] > *", $container ).appendAround();

            // Now that we’ve added the appendAround shims, let’s add our height fixer!
            $this.bind( "create.carousel ajaxIncludeResponse", function() {
                imagesLoaded( $this[ 0 ], function() {
                    EYP.utils.fixCarouselHeight( this );
                } );
            } )

            // And let’s *also* run our height fixer after the images have loaded. (via http://imagesloaded.desandro.com/v3/)
            imagesLoaded( $this[ 0 ], function() {
                EYP.utils.fixCarouselHeight( $this[ 0 ] );
            } );
        });
    };

    // auto-init on enhance (which is called on domready)
    $( document ).bind( "enhance", function( e ){
        var $sel = $( e.target ).is( initSelector ) ? $( e.target ) : $( initSelector, e.target );
        $sel[ componentName ]().attr( enhancedAttr, "true" );
    });

}( jQuery ));

/*!
Waypoints Inview Shortcut - 4.0.1
Copyright © 2011-2016 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/waypoints/blob/master/licenses.txt
*/
(function() {
  'use strict'

  function noop() {}

  var Waypoint = window.Waypoint

  /* http://imakewebthings.com/waypoints/shortcuts/inview */
  function Inview(options) {
    this.options = Waypoint.Adapter.extend({}, Inview.defaults, options)
    this.axis = this.options.horizontal ? 'horizontal' : 'vertical'
    this.waypoints = []
    this.element = this.options.element
    this.createWaypoints()
  }

  /* Private */
  Inview.prototype.createWaypoints = function() {
    var configs = {
      vertical: [{
        down: 'enter',
        up: 'exited',
        offset: '100%'
      }, {
        down: 'entered',
        up: 'exit',
        offset: 'bottom-in-view'
      }, {
        down: 'exit',
        up: 'entered',
        offset: 0
      }, {
        down: 'exited',
        up: 'enter',
        offset: function() {
          return -this.adapter.outerHeight()
        }
      }],
      horizontal: [{
        right: 'enter',
        left: 'exited',
        offset: '100%'
      }, {
        right: 'entered',
        left: 'exit',
        offset: 'right-in-view'
      }, {
        right: 'exit',
        left: 'entered',
        offset: 0
      }, {
        right: 'exited',
        left: 'enter',
        offset: function() {
          return -this.adapter.outerWidth()
        }
      }]
    }

    for (var i = 0, end = configs[this.axis].length; i < end; i++) {
      var config = configs[this.axis][i]
      this.createWaypoint(config)
    }
  }

  /* Private */
  Inview.prototype.createWaypoint = function(config) {
    var self = this
    this.waypoints.push(new Waypoint({
      context: this.options.context,
      element: this.options.element,
      enabled: this.options.enabled,
      handler: (function(config) {
        return function(direction) {
          self.options[config[direction]].call(self, direction)
        }
      }(config)),
      offset: config.offset,
      horizontal: this.options.horizontal
    }))
  }

  /* Public */
  Inview.prototype.destroy = function() {
    for (var i = 0, end = this.waypoints.length; i < end; i++) {
      this.waypoints[i].destroy()
    }
    this.waypoints = []
  }

  Inview.prototype.disable = function() {
    for (var i = 0, end = this.waypoints.length; i < end; i++) {
      this.waypoints[i].disable()
    }
  }

  Inview.prototype.enable = function() {
    for (var i = 0, end = this.waypoints.length; i < end; i++) {
      this.waypoints[i].enable()
    }
  }

  Inview.defaults = {
    context: window,
    enabled: true,
    enter: noop,
    entered: noop,
    exit: noop,
    exited: noop
  }

  Waypoint.Inview = Inview
}())
;
/*! Ajax-Include - v0.1.4 - 2015-12-09
* http://filamentgroup.com/lab/ajax_includes_modular_content/
* Copyright (c) 2015 @scottjehl, Filament Group, Inc.; Licensed MIT */

(function( $, win, undefined ){

	var AI = {
		boundAttr: "data-ajax-bound",
		interactionAttr: "data-interaction",
		// request a url and trigger ajaxInclude on elements upon response
		makeReq: function( url, els, isHijax ) {
			$.get( url, function( data, status, xhr ) {
				els.trigger( "ajaxIncludeResponse", [ data, xhr ] );
			});
		},
		plugins: {}
	};

	$.fn.ajaxInclude = function( options ) {
		var urllist = [],
			elQueue = $(),
			o = {
				proxy: null
			};

		// Option extensions
		// String check: deprecated. Formerly, proxy was the single arg.
		if( typeof options === "string" ){
			o.proxy = options;
		}
		else {
			o = $.extend( o, options );
		}

		// if it's a proxy, que the element and its url, if not, request immediately
		function queueOrRequest( el ){
			var url = el.data( "url" );
			if( o.proxy && $.inArray( url, urllist ) === -1 ){
				urllist.push( url );
				elQueue = elQueue.add( el );
			}
			else{
				AI.makeReq( url, el );
			}
		}

		// if there's a url queue
		function runQueue(){
			if( urllist.length ){
				AI.makeReq( o.proxy + urllist.join( "," ), elQueue );
				elQueue = $();
				urllist = [];
			}
		}

		// bind a listener to a currently-inapplicable media query for potential later changes
		function bindForLater( el, media ){
			var mm = win.matchMedia( media );
			function cb(){
				queueOrRequest( el );
				runQueue();
				mm.removeListener( cb );
			}
			if( mm.addListener ){
				mm.addListener( cb );
			}
		}

		// loop through els, bind handlers
		this.not( "[" + AI.boundAttr + "]").not("[" + AI.interactionAttr + "]" ).each(function( k ) {
			var el = $( this ),
				media = el.attr( "data-media" ),
				methods = [ "append", "replace", "before", "after" ],
				method,
				url,
				isHijax = false,
				target = el.attr( "data-target" );

			for( var ml = methods.length, i=0; i < ml; i++ ){
				if( el.is( "[data-" + methods[ i ] + "]" ) ){
					method = methods[ i ];
					url = el.attr( "data-" + method );
				}
			}

			if( !url ) {
				// <a href> or <form action>
				url = el.attr( "href" ) || el.attr( "action" );
				isHijax = true;
			}

			if( method === "replace" ){
				method += "With";
			}

			el.data( "method", method )
				.data( "url", url )
				.data( "target", target )
				.attr( AI.boundAttr, true )
				.each( function() {
					for( var j in AI.plugins ) {
						AI.plugins[ j ].call( this, o );
					}
				})
				.bind( "ajaxIncludeResponse", function( e, data, xhr ){
					var content = data,
						targetEl = target ? $( target ) : el;

					if( o.proxy ){
						var subset = new RegExp("<entry url=[\"']?" + el.data("url") + "[\"']?>((?:(?!</entry>)(.|\n))*)", "gmi").exec(content);
						if( subset ){
							content = subset[1];
						}
					}

					var filteredContent = el.triggerHandler( "ajaxIncludeFilter", [ content ] );

					if( filteredContent ){
						content = filteredContent;
					}

					if( method === 'replaceWith' ) {
						el.trigger( "ajaxInclude", [ content ] );
						targetEl[ el.data( "method" ) ]( content );
					} else {
						targetEl[ el.data( "method" ) ]( content );
						el.trigger( "ajaxInclude", [ content ] );
					}
				});

			// When hijax, ignores matchMedia, proxies/queueing
			if ( isHijax ) {
				AI.makeReq( url, el, true );
			}
			else if ( !media || ( win.matchMedia && win.matchMedia( media ).matches ) ) {
				queueOrRequest( el );
			}
			else if( media && win.matchMedia ){
				bindForLater( el, media );
			}
		});

		// empty the queue for proxied requests
		runQueue();

		// return elems
		return this;
	};

	win.AjaxInclude = AI;
}( jQuery, this ));

/*! appendAround markup pattern. [c]2012, @scottjehl, Filament Group, Inc. MIT/GPL 
how-to:
	1. Insert potential element containers throughout the DOM
	2. give each container a data-set attribute with a value that matches all other containers' values
	3. Place your appendAround content in one of the potential containers
	4. Call appendAround() on that element when the DOM is ready
*/
(function( $ ){
	$.fn.appendAround = function(){
	  return this.each(function(){
      
	    var $self = $( this ),
	        att = "data-set",
	        $parent = $self.parent(), 
	        parent = $parent[ 0 ],
	        attval = $parent.attr( att ),
	        $set = $( "["+ att +"='" + attval + "']" );

		function isHidden( elem ){
			return $(elem).css( "display" ) === "none";
		}

		function appendToVisibleContainer(){
			if( isHidden( parent ) ){
				var found = 0;
				$set.each(function(){
					if( !isHidden( this ) && !found ){
						$self.appendTo( this );
						found++;
						parent = this;
					}
				});
	      	}
	    }
      
	    appendToVisibleContainer();
      
	    $(window).bind( "resize", appendToVisibleContainer );
      
	  });
	};
}( jQuery ));
/*
Component: Photomap
*/
(function( $ ) {
    "use strict";

    var componentName = "photomap",
        enhancedAttr = "data-enhanced-" + componentName,
        initSelector = "." + componentName + ":not([" + enhancedAttr + "])";

    $.fn[ componentName ] = function(){


        return this.each( function(){
            // Define some variables referring to this photomap, the `li` and `a` elements within it, and the class we’ll use to “open” the links.
            var $target = $( this ),
                $items = $target.find( "li" ),
                $links = $target.find( "a" ),
                activeClass = "is-open",
                titleId = $( this ).attr('data-title');


            // On small screens, the captions will appear *beneath* the image. So let’s insert an empty `div` to hold them. (We’ll use appendAround to shuttle the captions between this block and their “overlay” position on the image.)
            var $captions = $( '<div class="photomap-captions"></div>' ).insertAfter( $target );

            // Each `li` contains text for each “feature” shown on the photomap, but it also contains positioning information. Let’s cycle through each, and process them accordingly.
            $items.each( function() {
                var $this = $( this ),
                    $link = $this.find( "a" ),
                    style = $this.attr( "style" ),
                    thisClass = [];

                // Let’s grab the caption associated with each feature, keying off the `href` in each link.
                var id = $link.attr( "href" ).split( "#" )[ 1 ];
                var caption = $( "#" + id ).parent( "p" );

                // For each caption, we’ll append a `<p data-set="[id]">` element to our captions block, which we’ll eventually use for appendAround purposes.
                $captions.append( '<p data-set="' + id + '"></p>' ); 

                caption.attr( "data-set", id );

                // Take the `style` attribute on this list item, and apply it to the link!
                $link.attr( "style" ,  style );

                /*
                Parse the x/y coordinates to see if this caption is too far up (or down).
                */
                // Define some regular expressions
                var testX = /left\: ?(\d+)%/g,
                    testY = /top\: ?(\d+)%/g;

                // Execute the search
                var searchX = testX.exec( style ),
                    searchY = testY.exec( style );

                // Store the results
                var x = searchX[ 1 ],
                    y = searchY[ 1 ];

                // If this caption is too far up or down, apply the near-x / far-x and near-y / far-y classes.
                if ( x >= 70 ) {
                    thisClass.push( "far-x" );
                } else if ( x <= 30 ) {
                    thisClass.push( "near-x" );
                }
                if ( y >= 60 ) {
                    thisClass.push( "far-y" );
                } else if ( y <= 20 ) {
                    thisClass.push( "near-y" );
                }

                if ( thisClass.length > 0 ) {
                    $this.addClass( thisClass.join(" ") );
                }
            } );

            // Initialize appendAround
            $( "[data-set] > *", $target ).appendAround();


            // Event handlers for the circle links shown on the photomap
            $links
                .bind( "open", function() {
                    // When the “open” event is triggered, add the `activeClass` to the link *and* the caption
                    var $parent = $( this ).parent(),
                        slug = $( this ).attr( "href" ).split( "#" )[ 1 ],
                        $caption = $( "#" + slug ).parent();

                    $parent.addClass( activeClass );
                    $caption.addClass( activeClass );
                } )
                .bind( "close", function() {
                    // When the “close” event is triggered, REMOVE the `activeClass` from the link *and* its caption
                    var $parent = $( this ).parent(),
                        slug = $( this ).attr( "href" ).split( "#" )[ 1 ],
                        $caption = $( "#" + slug ).parent();

                    $parent.removeClass( activeClass );
                    $caption.removeClass( activeClass );
                } )
                .bind( "click", function() {
                    // If the link is “open” (i.e., it has the `activeClass`), then trigger the “close” event; otherwise if it’s “closed” (i.e., there’s no `activeClass`), then trigger the “open” event!
                    var $parent = $( this ).parent();

                    $parent.siblings().find( "a" ).trigger( "close" );

                    if ( $parent.is( "." + activeClass ) ) {
                        $( this ).trigger( "close" );
                    } else {
                        $( this ).trigger( "open" );
                    }

                    // Prevent the link from firing
                    return false;
                } );

            // Close the tabs if the user taps/clicks anywhere
            $( document ).bind( "click", function( e ) {
                var $target = $( e.target );
                var $parents = $target.parents();

                if ( !$parents.filter( $links ).length ) {
                    $links.trigger( "close" );
                }
            } );

            // It’s likely this will run _after_ grunticon does, so let’s re-add our SVGs to the document.
            EYP.utils.embedSVGs();

        });
    };

    // auto-init on enhance (which is called on domready)
    $( document ).bind( "enhance", function( e ){
        var $sel = $( e.target ).is( initSelector ) ? $( e.target ) : $( initSelector, e.target );
        $sel[ componentName ]().attr( enhancedAttr, "true" );
    });

}( jQuery ));

/*
Component: Photomap
*/
(function( $ ) {

    "use strict";

    var componentName = "additional",
        enhancedAttr = "data-enhanced-" + componentName,
        initSelector = "." + componentName + ":not([" + enhancedAttr + "])";

    $.fn[ componentName ] = function(){

        var lang = window.EYP.lang,
            count = 0;

        // Loop through each `.additional` block.
        return this.each( function(){

            var $target = $( this ),
                hiddenClass = "is-closed",
                link = '<a class="more" data-alt="' + lang.moreLinks.textAlt + '" href="#{id}">' + lang.moreLinks.textDefault + '</a>';

            // Find the paragraph immediately before this block.
            var $sibling = $target.prev( "p" );

            // Did we find a paragraph? Great. Let’s add the toggling behavior.
            if ( $sibling.length === 1 ) {
                // Set an identifier for this content block.
                var id = "additional-content-" + count;
                // Now, we’ll apply the identifier to the `id` of the content block AND the `href` of the link.
                var $link = $( link.split( "{id}" ).join( id ) );
                $target.attr( "id", id );

                // Drop the link into the paragraph.
                $sibling.append( $link );

                // Attach an event handler to the $link.
                $link
                    .bind( "click", function() {
                        /*
                        Define some variables:
                         - $link refers to this, uh, link
                         - $target uses the $link’s `href` to target the .additional block we’ll expand or collapse
                         - text is the text inside $link
                         - alt is the value of $link’s [data-alt] attribute
                        */
                        var $link = $( this ),
                            $target = $( "#" + $link.attr( "href" ).split( "#" )[ 1 ] ),
                            text = $link.text(),
                            alt = $link.attr( "data-alt" );

                        // Let’s swap the text shown in the link (from MORE to LESS, or vice versa)
                        $link.html( alt );
                        $link.attr( "data-alt", text );

                        // Show/hide the $target: if $target currently has the hiddenClass, remove it; otherwise, add it.
                        if ( $target.is( "." + hiddenClass ) ) {
                            $target.removeClass( hiddenClass );
                        } else {
                            $target.addClass( hiddenClass );
                        }

                        // Prevent the default link behavior
                        return false;
                    } );

                // Hide the block.
                $target.addClass( hiddenClass );
            }

            // Increment the counter
            count++;

        });
    };

    // auto-init on enhance (which is called on domready)
    $( document ).bind( "enhance", function( e ){
        var $sel = $( e.target ).is( initSelector ) ? $( e.target ) : $( initSelector, e.target );
        $sel[ componentName ]().attr( enhancedAttr, "true" );
    });

}( jQuery ));

/*
- Creates a dropdown out of a list of items if javascript is enabled
*/
(function( $ ) {
    
    $('body').on('click', function(e) {
        

        // if the area clicked is a eyp dropdown, close all others and open it.
        if($(e.target).is('.eyp-dropdown-select')) {

            // Close all dropdowns
            $('.eyp-dropdown').removeClass('active');

            if ($(e.target).next().is('.active')) {
                $('.eyp-dropdown').removeClass('active');
                $('.eyp-dropdown-select').removeClass('active');
            }

            else {
                $(e.target).next().addClass('active');
                $(e.target).addClass('active');
            }
        }

        // if area clicked is not an eyp dropdown, close all of them

        else {
            $('.eyp-dropdown').removeClass('active');
            $('.eyp-dropdown-select').removeClass('active');
        }

    });

}( jQuery ));


(function( $ ) {
    "use strict";

    var componentName = "eyp-dropdown-expertise",
        initSelector = "." + componentName ;

    $()


    // auto-init on enhance (which is called on domready)
    $( document ).bind( "enhance", function( e ){
        var label = $(initSelector).attr("data-label");
        var html = $(initSelector).parent().html();
        $(initSelector).parent().html('<div class="eyp-dropdown-container"><div class="eyp-dropdown-select">' + label + '</div>' + html + '</div>');

    });

}( jQuery ));

(function( $ ) {
    "use strict";

    var componentName = "eyp-dropdown-work",
        initSelector = "." + componentName ;

    $()


    // auto-init on enhance (which is called on domready)
    $( document ).bind( "enhance", function( e ){
        var label = $(initSelector).attr("data-label");
        var html = $(initSelector).parent().html();
        $(initSelector).parent().html('<div class="eyp-dropdown-container"><div class="eyp-dropdown-select">' + label + '</div>' + html + '</div>');

    });

}( jQuery ));




// Init components/plugins on DOMready

jQuery( "[data-set] > *" ).appendAround();

jQuery( "[data-append], [data-replace], [data-after], [data-before]" ).ajaxInclude();

jQuery( ".search-anchor").bind( "click", function( event ) {
	onloadFocus();
});



jQuery( document ).trigger( "enhance" );

function onloadFocus(){
    setTimeout(function() {
        document.getElementById('edit-keys--2').focus();
    }, 10);
}


jQuery('.pull').each(function() {
  new Waypoint.Inview({
    element: this,
    entered: function(direction) {
      jQuery(this.element).addClass('entered');
    }
  });
});


jQuery('.pg-content>div:not(.story-featured):not(.l-equal)').each(function() {
  new Waypoint({
    element: this,
    handler: function(direction) {
      console.log('25px past the top');
      jQuery(this.element).addClass('enter');
    },
    offset: '60%'
  });
});


jQuery('.vignette-inner').each(function() {
  new Waypoint({
    element: this,
    handler: function(direction) {
      console.log('25px past the top');
      jQuery(this.element).addClass('enter-v');
    },
    offset: '65%'
  });
});


jQuery( document ).on( "click", function( e ) {


    if ((jQuery(e.target).is('.data-touchpoint *')) ||(jQuery(e.target).is('.data-touchpoint'))) {
      
      event.preventDefault();

      if (jQuery(e.target).closest('.data-touchpoint').hasClass('is-open')) {
          jQuery(e.target).closest('.data-touchpoint').removeClass('is-open');
          jQuery('.viz-extra-caption').removeClass('active');
      } 
      
      else {
          jQuery('.viz-extra-caption').removeClass('active');
          jQuery('.data-touchpoint').removeClass('is-open');
          jQuery(e.target).closest('.data-touchpoint').addClass('is-open');
          jQuery(e.target).closest('.data-touchpoint').next().addClass('active');

      }
    }

    else if (jQuery(e.target).is('.tab-menu li')) {

      jQuery('.tab-menu li').removeClass('active');

      jQuery('.tab-container div').removeClass('active');

      jQuery(e.target).addClass('active');

      var topic = jQuery(e.target).data("tab-subject");
      console.log(topic);
      jQuery('.tab-container div[data-tab-container="' + topic + '"]').addClass('active');
    }


    else if (jQuery(e.target).is('.special') || jQuery(e.target).is('.plus')) {
      event.preventDefault();

      if (jQuery('.special').hasClass('active')) {
        jQuery('.special').removeClass('active');
        jQuery('.special .plus').text('+');
        jQuery('.special-hidden').removeClass('active');
      }

      else { 
        jQuery('.special').addClass('active');
        jQuery('.special .plus').text('-');
        jQuery('.special-hidden').addClass('active');
      }

    }

    else {
        jQuery('.viz-extra-caption').removeClass('active');
        jQuery('.data-touchpoint').removeClass('is-open');
    }
} );



