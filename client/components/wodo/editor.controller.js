'use strict';

/*global Wodo*/

angular.module('manticoreApp')
.controller('WodoCtrl', function ($scope, Auth, Adaptor) {
    var editorInstance,
        operationRouter,
        clientAdaptor,
        editorOptions = {
            collabEditingEnabled: true,
            unstableFeaturesEnabled: true,
            imageEditingEnabled: false,
            hyperlinkEditingEnabled: false
        },
        onConnectCalled = false,
        listeners = {},
        allowedOrigin;

    function addIframeEventListener(name, callback) {
      if (!listeners[name]) {
        listeners[name] = [];
      }
      listeners[name].push(callback);
    }

    function removeIframeEventListener(name, callback) {
      if (!listeners[name]) {
        return;
      }

      var index = listeners[name].indexOf(callback);
      if (index !== -1) {
        listeners[name].splice(index, 1);
      }
    }

    function broadcastIframeEvent(data) {
      if (allowedOrigin) {
        window.parent.postMessage(data, allowedOrigin);
      }
    }

    function setupCrossWindowMessaging() {
      var embedderHost = $scope.$root.config.embedderHost;
      if (embedderHost) {
        var temp = document.createElement('a');
        temp.href = embedderHost;
        allowedOrigin = temp.protocol + '//' + temp.host;

        window.addEventListener('message', function (event) {
          if (event.origin !== allowedOrigin || !event.data.name) {
            return;
          }

          console.log('Received message from Embedder: ' + event.data.name);

          var subscribers = listeners[event.data.name];
          if (subscribers && subscribers.length) {
            for(var i = 0; i < subscribers.length; i += 1) {
              subscribers[i](event);
            }
          }
        });
      }
    }

    function setupIframeAPI() {
      function handleMemberAdded(data) {
        $scope.editor.broadcastIframeEvent(_.merge({ name: 'memberAdded' }, data));
      }

      function handleMemberRemoved(data) {
        $scope.editor.broadcastIframeEvent(_.merge({ name: 'memberRemoved' }, data));
      }

      function getMembers(event) {
        event.source.postMessage({
          id: event.data.id,
          value: operationRouter.getMembers()
        }, event.origin);
      }

      $scope.$watch('joined', function (online) {
        if (online === undefined) { return; }
        if (online) {
          // Members
          operationRouter.subscribe('memberAdded', handleMemberAdded);
          operationRouter.subscribe('memberRemoved', handleMemberRemoved);
          $scope.editor.addIframeEventListener('getMembers', getMembers);
        } else {
          operationRouter.unsubscribe('memberAdded', handleMemberAdded);
          operationRouter.unsubscribe('memberRemoved', handleMemberRemoved);
          $scope.editor.removeIframeEventListener('getMembers', getMembers);
        }
      });
    }

    function closeEditing() {
        editorInstance.leaveSession(function () {
            $scope.$apply(function () {
                $scope.joined = false;
            });
            clientAdaptor.leaveSession(function () {
                console.log('Closed editing, left session.');
            });
        });
    }

    function handleEditingError(error) {
        alert('Something went wrong!\n' + error);
        console.log(error);
        closeEditing();
    }

    function openEditor(permission) {
        setupCrossWindowMessaging();

        if (permission === 'write') {
          editorOptions.allFeaturesEnabled = true;
          editorOptions.reviewModeEnabled = false;
        } else {
          editorOptions.reviewModeEnabled = true;
        }

        Wodo.createCollabTextEditor('wodoContainer', editorOptions, function (err, editor) {
            editorInstance = editor;
            $scope.editor = editor;

            $scope.editor.addIframeEventListener = addIframeEventListener;
            $scope.editor.removeIframeEventListener = removeIframeEventListener;
            $scope.editor.broadcastIframeEvent = broadcastIframeEvent;

            editorInstance.clientAdaptor = clientAdaptor;
            editorInstance.addEventListener(Wodo.EVENT_UNKNOWNERROR, handleEditingError);
            editorInstance.joinSession(clientAdaptor, function () {
              operationRouter = clientAdaptor.getOperationRouter();
              $scope.operationRouter = operationRouter;
              setupIframeAPI();

                $scope.$apply(function () {
                    $scope.joined = true;
                });
                $scope.editor.broadcastIframeEvent({
                  name: 'ready'
                });
            });
        });
    }

    function boot() {
        clientAdaptor = new Adaptor(
            $scope.document._id,
            Auth.getToken(),
            function onConnect() {
                console.log('onConnect');
                if (onConnectCalled) {
                    console.log('Reconnecting not yet supported');
                    return;
                }
                onConnectCalled = true;

                clientAdaptor.joinSession(function (memberId, permission) {
                    if (!memberId) {
                        console.log('Could not join; memberId not received');
                    } else {
                        console.log('Joined with memberId ' + memberId);
                        openEditor(permission);
                    }
                });
            },
            function onKick() {
                console.log('onKick');
                closeEditing();
            },
            function onDisconnect() {
                console.log('onDisconnect');
            }
        );
    }

    function destroy (cb) {
        if (editorInstance) {
            closeEditing();
            editorInstance.destroy(cb);
        } else {
            if (clientAdaptor) {
                clientAdaptor.leaveSession();
                clientAdaptor.destroy();
                cb();
            }
        }
    }

    this.boot = boot;
    this.destroy = destroy;
});
