from pathlib import Path
import pytest

from app.analysis import analyze_text, extract_text

CASES = [
    ("customer-portal.txt", "Restricted PII"),
    ("firewall-events.txt", "Internal"),
    ("employee-directory.csv", "Restricted PII"),
    ("vendor-contract.csv", "Confidential"),
    ("hr-directory.xlsx", "Restricted PII"),
    ("usage-telemetry.xlsx", "Internal"),
    ("support-ticket.docx", "Restricted PII"),
    ("finance-plan.docx", "Confidential"),
    ("health-privacy-review.pdf", "Sensitive PII"),
    ("security-log-review.pdf", "Internal"),
]

@pytest.mark.parametrize(("filename", "expected_classification"), CASES)
def test_supported_synthetic_files_are_extracted_and_classified(filename, expected_classification):
    file_path = Path("docs/demo-data") / filename
    text = extract_text(file_path, file_path.suffix)
    result = analyze_text(text, processors=[])
    assert text.strip()
    assert result["classification"] == expected_classification

def test_negated_control_statements_create_expected_findings():
    result = analyze_text(
        "Customer name and email address are processed. "
        "Multi-factor authentication is not documented. "
        "A retention schedule is not documented. "
        "Data is encrypted at rest and in transit.",
        processors=[],
    )
    titles = {finding["title"] for finding in result["findings"]}
    assert "Privileged access lacks MFA" in titles
    assert "Retention period not defined" in titles
    assert "Encryption control requires validation" not in titles
