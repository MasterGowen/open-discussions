"""Embed.ly views"""
from urllib.parse import unquote
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from django.conf import settings

from embedly.api import get_embedly


@api_view()
def embedly_view(request, **kwargs):  # pylint: disable=unused-argument
    """get Embedly API, return the JSON"""
    if settings.EMBEDLY_KEY:
        url = unquote(unquote(kwargs["url"]))
        response = get_embedly(url).json()
        return Response(response)
    else:
        return Response({}, status=status.HTTP_503_SERVICE_UNAVAILABLE)