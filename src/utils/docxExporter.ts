import { Document, Packer, Paragraph, TextRun } from 'docx';

export const exportToWord = async (text: string, filename: string = 'legal_interpretation.docx') => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: text.split('\n').map(line => new Paragraph({
          children: [new TextRun(line)],
        })),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
