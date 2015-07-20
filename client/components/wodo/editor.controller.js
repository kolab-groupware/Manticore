'use strict';

/*global Wodo*/

angular.module('manticoreApp')
.controller('WodoCtrl', function ($scope, Auth, Adaptor) {
    var editorInstance,
        clientAdaptor,
        editorOptions = {
            collabEditingEnabled: true,
            allFeaturesEnabled: true
        },
        onConnectCalled = false;

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

    function openEditor() {
        Wodo.createCollabTextEditor('wodoContainer', editorOptions, function (err, editor) {
            editorInstance = editor;
            $scope.editor = editor;
            editorInstance.addEventListener(Wodo.EVENT_UNKNOWNERROR, handleEditingError);
            editorInstance.joinSession(clientAdaptor, function () {
                $scope.$apply(function () {
                    $scope.joined = true;
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

                clientAdaptor.joinSession(function (memberId) {
                    if (!memberId) {
                        console.log('Could not join; memberId not received');
                    } else {
                        console.log('Joined with memberId ' + memberId);
                        openEditor();
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
