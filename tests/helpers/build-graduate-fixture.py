"""Synthetic two-page graduate timetable. No student or private account data."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

output = Path(__file__).resolve().parents[1] / 'fixtures/mobile-paste/graduate.synthetic.pdf'
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
pdf = canvas.Canvas(str(output), pagesize=(841.89, 595.27), invariant=1)
pdf.setTitle('Synthetic graduate timetable regression fixture')
for page, day, name, periods, weeks, room in [
    (1, 2, '现代设计方法', '1,2', '2-17', '瑞师楼（原3号教学楼）222'),
    (2, 3, '研究生美育', '9,10', '10-17', '瑞师楼（原3号教学楼）226'),
]:
    pdf.setFont('STSong-Light', 16)
    pdf.drawString(250, 551, '沈阳化工大学2026-2027学年第1学期课表')
    pdf.setFont('STSong-Light', 10)
    for index, label in enumerate(['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']):
        pdf.drawString(109.03 + 106.31 * index, 510, label)
    x = 73.97 + 106.31 * (day - 1)
    lines = [name, '测试甲 1班', '节次:' + periods + '节', '周次:' + weeks,
             '地点:' + room[:9], room[9:], '开课院系:研究生院', '电话:']
    for index, line in enumerate(lines):
        pdf.drawString(x, 483 - 14 * index, line)
    pdf.setFont('STSong-Light', 10)
    pdf.drawString(360, 40, f'合成测试文件 - 第 {page} 页')
    pdf.showPage()
pdf.save()
print(output)
