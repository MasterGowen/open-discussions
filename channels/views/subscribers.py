"""Views for REST APIs for channels"""

from praw.models import Redditor
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.serializers import SubscriberSerializer
from open_discussions.permissions import JwtIsStaffOrReadonlyPermission


class SubscriberListView(CreateAPIView):
    """
    View to add subscribers in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )
    serializer_class = SubscriberSerializer


class SubscriberDetailView(APIView):
    """
    View to retrieve and remove subscribers in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )

    def get(self, request, *args, **kwargs):
        """Get subscriber for the channel"""
        api = Api(user=request.user)
        subscriber_name = self.kwargs['subscriber_name']
        channel_name = self.kwargs['channel_name']
        if not api.is_subscriber(subscriber_name, channel_name):
            raise NotFound('User {} is not a subscriber of {}'.format(subscriber_name, channel_name))
        return Response(
            SubscriberSerializer(
                Redditor(api.reddit, name=subscriber_name)
            ).data
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a subscriber from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        subscriber_name = self.kwargs['subscriber_name']

        api.remove_subscriber(subscriber_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)