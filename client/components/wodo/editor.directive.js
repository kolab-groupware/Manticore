'use strict';

angular.module('manticoreApp')
.directive('wodoEditor', function () {
    return {
        restrict: 'E',
        templateUrl: 'components/wodo/editor.html',
        controller: 'WodoCtrl',
        controllerAs: 'wodoCtrl',
        link: function (scope) {
            var wodoCtrl = scope.wodoCtrl;
            var usedLocale = 'C';
            var wodoPrefix = '/bower_components/wodo/wodo';

            if (navigator && navigator.language.match(/^(de)/)) {
              usedLocale = navigator.language.substr(0, 2);
            }

            window.dojoConfig = {
              locale: usedLocale,
              paths: {
                  'webodf/editor': wodoPrefix,
                  'dijit': wodoPrefix + '/dijit',
                  'dojox': wodoPrefix + '/dojox',
                  'dojo': wodoPrefix + '/dojo',
                  'resources': wodoPrefix + '/resources'
              }
            };

            function loadDependencies(callback) {
                var head = document.getElementsByTagName('head')[0],
                    frag = document.createDocumentFragment(),
                    link,
                    script;

                // append two link and two script elements to the header
                link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = wodoPrefix + '/app/resources/app.css';
                link.type = 'text/css';
                link.async = false;
                frag.appendChild(link);
                link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = wodoPrefix + '/wodocollabpane.css';
                link.type = 'text/css';
                link.async = false;
                frag.appendChild(link);
                script = document.createElement('script');
                script.src = wodoPrefix + '/dojo-amalgamation.js';
                script['data-dojo-config'] = 'async: true';
                script.charset = 'utf-8';
                script.type = 'text/javascript';
                script.async = false;
                frag.appendChild(script);
                script = document.createElement('script');
                script.src = wodoPrefix + '/webodf.js';
                script.charset = 'utf-8';
                script.type = 'text/javascript';
                script.async = false;
                frag.appendChild(script);
                script = document.createElement('script');
                script.src = wodoPrefix + '/wodocollabtexteditor.js';
                script.charset = 'utf-8';
                script.type = 'text/javascript';
                script.async = false;
                script.onload = callback;

                frag.appendChild(script);
                head.appendChild(frag);
            }

            loadDependencies(function () {
                wodoCtrl.boot();
            });
        }
    };
});
