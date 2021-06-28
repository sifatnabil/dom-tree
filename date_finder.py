import lexnlp.extract.en.dates
import sys

def find_date(text):
    res = list(lexnlp.extract.en.dates.get_dates(text))
    print(res[0])

if __name__ == "__main__":
    filename = sys.argv[1]
    with open(filename, "r", encoding='utf8') as f:
        text = f.read()

    find_date(text)