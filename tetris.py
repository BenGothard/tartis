import argparse
import random
import sys

parser = argparse.ArgumentParser(
    description='Tartis - a modern Tetris clone built with Python and Pygame.')
parser.add_argument(
    '--version', action='version', version='Tartis 1.0',
    help='Show program version and exit')
parser.parse_args()  # exits here on -h/--help before importing pygame

import pygame

# Game configuration
CELL_SIZE = 30
COLS = 10
ROWS = 20
WIDTH = CELL_SIZE * COLS
HEIGHT = CELL_SIZE * ROWS
FPS = 60

# Colors (R, G, B)
COLORS = {
    'black': (0, 0, 0),
    'gray': (128, 128, 128),
    'white': (255, 255, 255),
    'cyan': (0, 255, 255),
    'blue': (0, 0, 255),
    'orange': (255, 165, 0),
    'yellow': (255, 255, 0),
    'green': (0, 255, 0),
    'purple': (128, 0, 128),
    'red': (255, 0, 0)
}

# Tetromino shapes
SHAPES = {
    'I': [[1, 1, 1, 1]],
    'J': [[2, 0, 0],
          [2, 2, 2]],
    'L': [[0, 0, 3],
          [3, 3, 3]],
    'O': [[4, 4],
          [4, 4]],
    'S': [[0, 5, 5],
          [5, 5, 0]],
    'T': [[0, 6, 0],
          [6, 6, 6]],
    'Z': [[7, 7, 0],
          [0, 7, 7]]
}

SHAPE_COLORS = {
    1: COLORS['cyan'],
    2: COLORS['blue'],
    3: COLORS['orange'],
    4: COLORS['yellow'],
    5: COLORS['green'],
    6: COLORS['purple'],
    7: COLORS['red']
}

class Tetromino:
    def __init__(self, shape):
        self.shape = shape
        self.color = SHAPE_COLORS[self.value]
        self.x = COLS // 2 - len(shape[0]) // 2
        self.y = 0

    @property
    def value(self):
        # Determine integer value associated with this shape
        for k, v in SHAPES.items():
            if v == self.shape:
                return list(SHAPES.keys()).index(k) + 1
        return 0

    def rotate(self):
        self.shape = [list(row) for row in zip(*self.shape[::-1])]

class Tetris:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption('Tartis - Modern Tetris')
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        self.clock = pygame.time.Clock()
        self.board = [[0 for _ in range(COLS)] for _ in range(ROWS)]
        self.game_over = False
        self.current = self.new_piece()
        self.next_piece = self.new_piece()
        self.fall_time = 0
        self.fall_speed = 0.5
        self.score = 0

    def new_piece(self):
        shape = random.choice(list(SHAPES.values()))
        return Tetromino([row[:] for row in shape])

    def valid_space(self, shape, offset):
        off_x, off_y = offset
        for y, row in enumerate(shape):
            for x, cell in enumerate(row):
                if cell:
                    new_x = x + off_x
                    new_y = y + off_y
                    if new_x < 0 or new_x >= COLS or new_y >= ROWS:
                        return False
                    if new_y >= 0 and self.board[new_y][new_x]:
                        return False
        return True

    def lock_piece(self):
        for y, row in enumerate(self.current.shape):
            for x, cell in enumerate(row):
                if cell:
                    self.board[self.current.y + y][self.current.x + x] = self.current.value
        self.clear_lines()
        self.current = self.next_piece
        self.next_piece = self.new_piece()
        if not self.valid_space(self.current.shape, (self.current.x, self.current.y)):
            self.game_over = True

    def clear_lines(self):
        lines_cleared = 0
        for i in range(ROWS - 1, -1, -1):
            if 0 not in self.board[i]:
                lines_cleared += 1
                del self.board[i]
                self.board.insert(0, [0 for _ in range(COLS)])
        self.score += lines_cleared ** 2 * 100

    def draw_grid(self):
        for y in range(ROWS):
            for x in range(COLS):
                value = self.board[y][x]
                color = SHAPE_COLORS.get(value, COLORS['black'])
                pygame.draw.rect(self.screen, color,
                                 (x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE), 0)
                pygame.draw.rect(self.screen, COLORS['gray'],
                                 (x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE), 1)

    def draw_piece(self, piece):
        for y, row in enumerate(piece.shape):
            for x, cell in enumerate(row):
                if cell:
                    pygame.draw.rect(
                        self.screen,
                        piece.color,
                        ((piece.x + x) * CELL_SIZE, (piece.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE)
                    )

    def draw_next(self):
        font = pygame.font.SysFont('arial', 20)
        label = font.render('Next:', True, COLORS['white'])
        self.screen.blit(label, (WIDTH + 10, 10))
        for y, row in enumerate(self.next_piece.shape):
            for x, cell in enumerate(row):
                if cell:
                    pygame.draw.rect(
                        self.screen,
                        self.next_piece.color,
                        (WIDTH + 10 + x * CELL_SIZE, 40 + y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
                    )

    def draw_score(self):
        font = pygame.font.SysFont('arial', 20)
        score_label = font.render(f'Score: {self.score}', True, COLORS['white'])
        self.screen.blit(score_label, (WIDTH + 10, 150))

    def run(self):
        while not self.game_over:
            self.screen.fill(COLORS['black'])
            self.fall_time += self.clock.get_rawtime()
            self.clock.tick(FPS)

            if self.fall_time / 1000 >= self.fall_speed:
                self.fall_time = 0
                if self.valid_space(self.current.shape, (self.current.x, self.current.y + 1)):
                    self.current.y += 1
                else:
                    self.lock_piece()

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.game_over = True
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_LEFT and self.valid_space(self.current.shape, (self.current.x - 1, self.current.y)):
                        self.current.x -= 1
                    if event.key == pygame.K_RIGHT and self.valid_space(self.current.shape, (self.current.x + 1, self.current.y)):
                        self.current.x += 1
                    if event.key == pygame.K_DOWN and self.valid_space(self.current.shape, (self.current.x, self.current.y + 1)):
                        self.current.y += 1
                    if event.key == pygame.K_UP:
                        rotated = [list(row) for row in zip(*self.current.shape[::-1])]
                        if self.valid_space(rotated, (self.current.x, self.current.y)):
                            self.current.rotate()

            self.draw_grid()
            self.draw_piece(self.current)
            self.draw_next()
            self.draw_score()
            pygame.display.update()

        pygame.quit()
        sys.exit()

if __name__ == '__main__':
    game = Tetris()
    game.run()
