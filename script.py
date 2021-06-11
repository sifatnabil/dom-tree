import sys
from flair.data import Sentence
from flair.models import SequenceTagger
sys.stdout.reconfigure(encoding='utf-8')


def process_text(text):
    lines = text.split("\n")
    clean_text = " ".join(str(x.replace(u'\xa0', u' ')) for x in lines if x)
    return clean_text

def inference(text):
    tagger = SequenceTagger.load('flair/ner-english-fast')

    sentence = Sentence(text)
    tagger.predict(sentence)

    persons = []
    start_person_portion = False
    end_person_portion = False

    # print(sentence.get_spans('ner'))

    predicted_output = sentence.to_dict(tag_type='ner')
    entities = predicted_output["entities"]
    for ent in entities:
        for label in ent["labels"]:
            if "PER" in str(label):
                start_person_portion = True
                persons.append(ent['text'])
            elif "PER" not in str(label) and start_person_portion:
                end_person_portion = True
                break
        if end_person_portion: 
            break
    # for ent in entities: 
    #     for label in ent["labels"]:
    #         if "PER" in str(label):
    #             persons.append(ent['text'])
    #             # print(f"Name: {ent['text']}")
    #             break


    # # for entity in sentence.get_spans('ner'):
    # #     print(entity)

    print(persons)

if __name__ == '__main__':
    filename = sys.argv[1]
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()
    processed_text = process_text(text)
    inference(processed_text)
