from app.models.documents import ApplicationDocuments, CvDocument, DocumentSection
from app.models.review import ReviewResult


def test_application_documents_include_three_outputs():
    docs = ApplicationDocuments(
        ats_cv=CvDocument(title="ATS CV", sections=[DocumentSection(heading="Summary", items=["Python developer"])]),
        portfolio_cv=CvDocument(title="Portfolio CV"),
        cover_letter="Dear hiring team,\n\nI am interested in this role.",
    )

    assert docs.ats_cv.sections[0].heading == "Summary"
    assert docs.cover_letter.startswith("Dear hiring team")


def test_review_result_defaults_blocking_lists():
    review = ReviewResult(passed=False, overall_score=62)

    assert review.scores.truthfulness == 0
    assert review.blocking_issues == []
