"""Testing utils"""
import abc


def any_instance_of(*cls):
    """
    Returns a type that evaluates __eq__ in isinstance terms

    Args:
        cls (list of types): variable list of types to ensure equality against

    Returns:
        AnyInstanceOf: dynamic class type with the desired equality
    """
    class AnyInstanceOf(metaclass=abc.ABCMeta):
        """Dynamic class type for __eq__ in terms of isinstance"""
        def __eq__(self, other):
            return isinstance(other, cls)
    for c in cls:
        AnyInstanceOf.register(c)
    return AnyInstanceOf()
