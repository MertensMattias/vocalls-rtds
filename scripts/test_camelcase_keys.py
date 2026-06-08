import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "camelcase_keys", Path(__file__).with_name("camelcase_keys.py")
)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def test_simple_pascal():
    assert m.camel_case_key("SourceId") == "sourceId"
    assert m.camel_case_key("Operations") == "operations"
    assert m.camel_case_key("Params") == "params"
    assert m.camel_case_key("IsFirstOperation") == "isFirstOperation"


def test_underscore_first_segment_only():
    assert m.camel_case_key("NextStep_Success") == "nextStep_Success"
    assert m.camel_case_key("NextStep_Guard_ICT") == "nextStep_Guard_ICT"
    assert m.camel_case_key("PromptActivate_NL") == "promptActivate_NL"


def test_leading_acronym_run():
    assert m.camel_case_key("IVREvent") == "ivrEvent"
    assert m.camel_case_key("IVRAction") == "ivrAction"
    assert m.camel_case_key("CC") == "cc"
    assert m.camel_case_key("ANIConfirmation") == "aniConfirmation"


def test_internal_and_trailing_acronym_untouched():
    assert m.camel_case_key("SmsAccountId") == "smsAccountId"
    assert m.camel_case_key("OutboundANI") == "outboundANI"


def test_already_camel_is_idempotent():
    assert m.camel_case_key("sourceId") == "sourceId"
    assert m.camel_case_key("nextStep_Success") == "nextStep_Success"


def test_type_keeps_vocalls_suffix():
    assert m.camel_case_type("SetVariables_vocalls") == "setVariables_vocalls"
    assert m.camel_case_type("Guard_vocalls") == "guard_vocalls"
    assert m.camel_case_type("GuardTui_vocalls") == "guardTui_vocalls"


if __name__ == "__main__":
    # Allow running without pytest: execute every test_* and report.
    import traceback

    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except Exception:
                failures += 1
                print("FAIL", name)
                traceback.print_exc()
    raise SystemExit(1 if failures else 0)
