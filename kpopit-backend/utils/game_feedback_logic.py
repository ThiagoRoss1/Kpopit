# Partial feedback function
def partial_feedback_function(guess, answer):
        if guess == answer:
            return {
                "status": "correct",
                "correct_items": list(guess),
                "incorrect_items": []
            }
        
        partial = guess.intersection(answer) # == guess & answer 

        if partial:
            return {
                "status": "partial",
                "correct_items": list(partial),
                "incorrect_items": list(guess.difference(answer)) # == guess - answer
            }
        
        else:
            return {
                "status": "incorrect",
                "correct_items": [],
                "incorrect_items": list(guess)
            }
        
# Numerical feedback function
def numerical_feedback_function(guessed_idol, answer_data, fields):
        numerical_feedback = {}

        for field in fields:
            guess_val = guessed_idol.get(field)
            answer_val = answer_data.get(field)

            if guess_val is None or answer_val is None:
                numerical_feedback[field] = {
                    "status": "incorrect",
                    "correct_items": [],
                    "incorrect_items": []
                }
                continue

            if guess_val > answer_val:
                numerical_feedback[field] = {
                    "status": "higher",
                    "correct_items": [],
                    "incorrect_items": [guess_val]
                }

            elif guess_val < answer_val:
                numerical_feedback[field] = {
                    "status": "lower",
                    "correct_items": [],
                    "incorrect_items": [guess_val]
                }

            else:
                numerical_feedback[field] = {
                    "status": "correct",
                    "correct_items": [guess_val],
                    "incorrect_items": []
                }

        return numerical_feedback