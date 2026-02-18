
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

export const generateDocx = async (title: string, content: string) => {
    const lines = content.split("\n");
    const children = [];

    // Title
    children.push(
        new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
        })
    );

    // Content processing (simple markdown-like parsing)
    lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("# ")) {
            children.push(
                new Paragraph({
                    text: trimmed.replace("# ", ""),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 200, after: 100 },
                })
            );
        } else if (trimmed.startsWith("## ")) {
            children.push(
                new Paragraph({
                    text: trimmed.replace("## ", ""),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 150, after: 50 },
                })
            );
        } else if (trimmed.startsWith("- ")) {
            children.push(
                new Paragraph({
                    text: trimmed.replace("- ", ""),
                    bullet: { level: 0 },
                })
            );
        } else if (trimmed.length > 0) {
            children.push(
                new Paragraph({
                    children: [new TextRun(trimmed)],
                    spacing: { after: 100 },
                })
            );
        }
    });

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: children,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title}_초안.docx`);
};
