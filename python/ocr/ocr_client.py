import sys
import json
import traceback


def serialize_bbox(bbox):
    """Convert a PaddleOCR bbox (list of [x, y] pairs) into a flat list."""
    result = []
    for point in bbox:
        result.append(float(point[0]))
        result.append(float(point[1]))
    return result


def serialize_raw(result):
    """Convert the full PaddleOCR result into a JSON-safe structure."""
    serialized = []
    for line_group in result:
        group = []
        for item in line_group:
            bbox = item[0]
            text, confidence = item[1]
            group.append({
                "bbox": serialize_bbox(bbox),
                "text": text,
                "confidence": round(float(confidence), 4),
            })
        serialized.append(group)
    return serialized


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Image path argument is required"}))
        sys.exit(1)

    image_path = sys.argv[1]

    try:
        from paddleocr import PaddleOCR

        ocr = PaddleOCR(use_angle_cls=True, lang="es", show_log=False)

        result = ocr.ocr(image_path, cls=True)

        lines = []
        full_text = []

        if result and result[0]:
            for item in result[0]:
                bbox = item[0]
                text_info = item[1]
                text = text_info[0]
                confidence = text_info[1]

                lines.append({
                    "text": text,
                    "confidence": round(float(confidence), 4),
                    "bbox": serialize_bbox(bbox),
                })
                full_text.append(text)

        output = {
            "text": "\n".join(full_text),
            "lines": lines,
            "raw": serialize_raw(result) if result else [],
        }

        print(json.dumps(output, ensure_ascii=False))

    except Exception as e:
        error_info = {
            "error": str(e),
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(error_info, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
