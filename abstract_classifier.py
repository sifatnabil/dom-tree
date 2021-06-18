from flair.data import Sentence
from flair.models import TextClassifier
import sys

def process_text(text):
    lines = text.split("\n")
    clean_text = " ".join(str(x.replace(u'\xa0', u' ')) for x in lines if x)
    return clean_text

def classify(text):
    classifier = TextClassifier.load('best-model.pt')
    cleaned_sentence = process_text(text)
    sentence = Sentence(cleaned_sentence)
    classifier.predict(sentence)
    
    value = sentence.labels[0].value;
    score = sentence.labels[0].score;
    print(value);
    print(score);

if __name__ == '__main__':
    classify(sys.argv[1])